import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import { MapPin, Navigation, RefreshCw, User, Clock, AlertTriangle, Bell, Target, Check, X } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";

// Fix Leaflet default icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom coloured marker factory
function coloredIcon(color, hasAlert = false) {
  const badge = hasAlert
    ? `<div style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:#ef4444;border:2px solid white;"></div>`
    : "";
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;display:inline-block">
      <div style="
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        transform:rotate(-45deg);
      "></div>
      ${badge}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const STATUS_COLORS = {
  ACTIVE:    "#22c55e",
  APPROVED:  "#3b82f6",
  PENDING:   "#f59e0b",
  REVOKED:   "#ef4444",
  COMPLETED: "#6b7280",
};

const RADIUS_PRESETS = [
  { label: "50m (Test)", value: 50 },
  { label: "200m",       value: 200 },
  { label: "500m",       value: 500 },
  { label: "1km",        value: 1000 },
  { label: "5km",        value: 5000 },
];

const COLOMBO_TIMEZONE = "Asia/Colombo";
const SRI_LANKA_OFFSET_MINUTES = 5 * 60 + 30;

function parseServerDateTime(value) {
  if (!value) return null;
  let raw = String(value).trim().replace(",", ".");
  
  // Ensure we use 'T' instead of space for ISO format compatibility
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    raw = raw.replace(" ", "T");
  }

  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);

  // If the backend sends a timestamp without a timezone (like LocalDateTime),
  // we assume it is UTC because the server runs in UTC.
  if (!hasTimeZone) {
    raw += "Z";
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function MapClickHandler({ active, onMapClick }) {
  useMapEvents({
    click: (e) => { if (active) onMapClick(e.latlng); },
  });
  return null;
}

// Component to control map view
function MapController({ center, bounds, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    } else if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, bounds, zoom, map]);
  return null;
}

export default function InmateMapView() {
  const [searchParams] = useSearchParams();
  const focusLeaveId = searchParams.get("leaveId") ? Number(searchParams.get("leaveId")) : null;

  const [activeLeaves, setActiveLeaves] = useState([]);
  const [allLeaves, setAllLeaves]       = useState([]);
  const [inmates, setInmates]           = useState([]);
  const [gpsHistories, setGpsHistories] = useState({});
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [mapCenter, setMapCenter] = useState([7.8731, 80.7718]); // Sri Lanka centre
  const [mapBounds, setMapBounds] = useState(null);
  const [mapZoom, setMapZoom] = useState(15);
  const initialFitDone = useRef(false);
  // Geofence setter
  const [geofenceSetMode, setGeofenceSetMode] = useState(false);
  const [pendingGeofence, setPendingGeofence] = useState(null); // { lat, lng }
  const [geofenceRadius, setGeofenceRadius]   = useState(50);   // default 50m for easy testing
  const [savingGeofence, setSavingGeofence]   = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const autoRefreshRef = useRef(null);
  const markerRefs = useRef({});

  // Open popup automatically when a leave is selected from the list
  useEffect(() => {
    if (selectedLeave) {
      setTimeout(() => {
        const marker = markerRefs.current[selectedLeave.id];
        if (marker && marker.openPopup) {
          marker.openPopup();
        }
      }, 300); // 300ms delay to wait for map pan/zoom animation to finish
    }
  }, [selectedLeave]);

  const loadData = useCallback(async () => {
    try {
      const [active, all, inmatesData, alerts] = await Promise.all([
        BackendRehabService.getActiveHomeLeaves(),
        BackendRehabService.getAllHomeLeaves(),
        InmateService.getAllInmates(),
        BackendRehabService.getUnacknowledgedAlerts().catch(() => []),
      ]);
      setActiveLeaves(active);
      setAllLeaves(all);
      setInmates(inmatesData);
      setGeofenceAlerts(alerts);

      // Load GPS history for ALL leaves that have a recorded position (not just active)
      const leavesNeedingHistory = all.filter((l) => l.lastKnownLat && l.lastKnownLng);
      const histories = {};
      await Promise.all(
        leavesNeedingHistory.map(async (leave) => {
          try {
            histories[leave.id] = await BackendRehabService.getGPSHistory(leave.id);
          } catch {
            histories[leave.id] = [];
          }
        })
      );
      setGpsHistories(histories);

      // Focus on specified leave if provided or auto-fit bounds
      if (!initialFitDone.current) {
        if (focusLeaveId) {
          const target = all.find((l) => l.id === focusLeaveId);
          if (target?.lastKnownLat && target?.lastKnownLng) {
            setMapCenter([target.lastKnownLat, target.lastKnownLng]);
            setMapBounds(null);
          }
          setSelectedLeave((prev) => prev ?? target ?? null);
        } else {
          const leavesWithPos = all.filter((l) => l.lastKnownLat && l.lastKnownLng);
          if (leavesWithPos.length > 0) {
            const bounds = L.latLngBounds(leavesWithPos.map(l => [l.lastKnownLat, l.lastKnownLng]));
            setMapBounds(bounds);
            setMapCenter(null);
          }
        }
        initialFitDone.current = true;
      } else {
        if (focusLeaveId && !selectedLeave) {
          const target = all.find((l) => l.id === focusLeaveId);
          if (target) setSelectedLeave(target);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [focusLeaveId]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds (fast enough to see live GPS updates)
    autoRefreshRef.current = setInterval(loadData, 15_000);
    return () => clearInterval(autoRefreshRef.current);
  }, [loadData]);

  const getInmateName = (id) => {
    const sid = String(id);
    const inm = inmates.find((i) => String(i.id) === sid || String(i.inmateId) === sid);
    if (!inm) return String(id);
    return `${inm.firstName || ""} ${inm.lastName || ""}`.trim() || String(id);
  };

  const handleMarkerClick = (leave) => {
    setSelectedLeave(leave);
    if (leave.lastKnownLat && leave.lastKnownLng) {
      setMapCenter([leave.lastKnownLat, leave.lastKnownLng]);
      setMapBounds(null);
      setMapZoom(18); // Zoom in closely to see only this inmate's vicinity
    }
  };

  const handleMapClick = ({ lat, lng }) => {
    setPendingGeofence({ lat, lng });
    setGeofenceSetMode(false);
  };

  const handleSetGeofenceFromLastPosition = () => {
    if (!selectedLeave?.lastKnownLat) return;
    setPendingGeofence({ lat: selectedLeave.lastKnownLat, lng: selectedLeave.lastKnownLng });
  };

  const handleSaveGeofence = async () => {
    if (!selectedLeave || !pendingGeofence) return;
    setSavingGeofence(true);
    try {
      await BackendRehabService.updateGeofence(
        selectedLeave.id, pendingGeofence.lat, pendingGeofence.lng, geofenceRadius
      );
      toast.success(`Geofence set: ${geofenceRadius}m radius`);
      setPendingGeofence(null);
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save geofence");
    } finally {
      setSavingGeofence(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await BackendRehabService.acknowledgeAlert(alertId, "admin");
      setGeofenceAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge");
    }
  };

  const handleFocusAlert = (alert) => {
    const targetLeave = allLeaves.find((l) => l.id === alert.homeLeaveId);
    if (!targetLeave) {
      toast.error("Could not locate related home leave on map");
      return;
    }
    handleMarkerClick(targetLeave);
    toast.success("Focused on alert location");
  };

  // Quick lookup sets
  const alertedLeaveIds = new Set(geofenceAlerts.map((a) => a.homeLeaveId));
  const leavesWithPosition = allLeaves.filter((l) => l.lastKnownLat && l.lastKnownLng);
  const sortedAlerts = useMemo(() => {
    return [...geofenceAlerts].sort((a, b) => {
      const severityRank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      const sevDiff = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      if (sevDiff !== 0) return sevDiff;

      const timeB = parseServerDateTime(b.alertedAt)?.getTime() ?? 0;
      const timeA = parseServerDateTime(a.alertedAt)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [geofenceAlerts]);
  const criticalAlertCount = sortedAlerts.filter((a) => a.severity === "CRITICAL").length;

  const formatTime = (iso) => {
    const d = parseServerDateTime(iso);
    if (!d) return "—";
    return d.toLocaleString("en-LK", {
      timeZone: COLOMBO_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const minutesSince = (iso) => {
    const d = parseServerDateTime(iso);
    if (!d) return null;
    return Math.round((Date.now() - d.getTime()) / 60000);
  };

  const formatRelativeTime = (iso) => {
    const mins = minutesSince(iso);
    if (mins === null) return "—";
    if (mins <= 0) return "just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours === 1) return "1 hour ago";
    const rem = mins % 60;
    return rem ? `${hours}h ${rem}m ago` : `${hours} hours ago`;
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left panel */}
      <div className="w-80 flex flex-col gap-3 h-full overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Navigation size={20} className="text-emerald-600" />
            Live GPS Map
          </h2>
          <button
            onClick={() => { loadData(); toast.success("Refreshed"); }}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Geofence Alerts Summary Button */}
        {geofenceAlerts.length > 0 && (
          <button 
            onClick={() => setShowAlertsModal(true)}
            className="w-full bg-red-50 hover:bg-red-100 border-2 border-red-400 rounded-xl p-3 flex items-center justify-between transition group shadow-sm flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell size={20} className="text-red-600 animate-bounce" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-700">Geofence Alerts</p>
                <p className="text-xs text-red-600 font-medium">{geofenceAlerts.length} Active</p>
              </div>
            </div>
            {criticalAlertCount > 0 && (
              <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm">
                {criticalAlertCount} CRITICAL
              </div>
            )}
          </button>
        )}

        {/* Selected leave detail */}
        {selectedLeave && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1.5 flex-shrink-0 overflow-y-auto max-h-[45%]">
            <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <MapPin size={12} className="text-indigo-500" /> Leave Detail
            </p>
            <div className="space-y-1">
              <p><span className="text-gray-500">Inmate:</span> {getInmateName(selectedLeave.inmateId)}</p>
              <p><span className="text-gray-500">Status:</span> {selectedLeave.status}</p>
              <p><span className="text-gray-500">Start:</span> {formatTime(selectedLeave.startDate)}</p>
              <p><span className="text-gray-500">End:</span> {formatTime(selectedLeave.endDate)}</p>
              <p><span className="text-gray-500">Destination:</span> {selectedLeave.destinationAddress || "—"}</p>
              <p><span className="text-gray-500">Contact:</span> {selectedLeave.contactPhone || "—"}</p>
              {selectedLeave.conditions && (
                <p><span className="text-gray-500">Conditions:</span> {selectedLeave.conditions}</p>
              )}
              {selectedLeave.lastKnownLat && (
                <p className="font-mono text-gray-500">
                  {selectedLeave.lastKnownLat.toFixed(5)}, {selectedLeave.lastKnownLng.toFixed(5)}
                </p>
              )}
              <p><span className="text-gray-500">GPS points:</span> {(gpsHistories[selectedLeave.id] || []).length}</p>
              {selectedLeave.geofenceRadiusMeters ? (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-700 text-[11px] mb-1">⭕ Geofence Active</p>
                  <p className="text-[10px] text-blue-600">Radius: {selectedLeave.geofenceRadiusMeters}m</p>
                  <p className="text-[10px] text-blue-600 font-mono">
                    Center: {selectedLeave.geofenceCenterLat?.toFixed(5)}, {selectedLeave.geofenceCenterLng?.toFixed(5)}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic">No geofence configured</p>
              )}
            </div>

            {/* ── Geofence Setter ── */}
            <div className="pt-2 border-t border-gray-100">
              <p className="font-semibold text-gray-600 mb-1.5 text-[11px] flex items-center gap-1">
                <Target size={10} /> Set / Update Geofence
              </p>
              {/* Radius presets */}
              <div className="flex flex-wrap gap-1 mb-2">
                {RADIUS_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setGeofenceRadius(p.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                      geofenceRadius === p.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Use inmate's last known position */}
              {selectedLeave.lastKnownLat && (
                <button
                  onClick={handleSetGeofenceFromLastPosition}
                  className="w-full text-[10px] py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition mb-1 flex items-center justify-center gap-1"
                >
                  <MapPin size={10} /> Use last known position ({geofenceRadius}m)
                </button>
              )}
              {/* Click map mode */}
              <button
                onClick={() => { setGeofenceSetMode((m) => !m); setPendingGeofence(null); }}
                className={`w-full text-[10px] py-1.5 border rounded-lg transition flex items-center justify-center gap-1 ${
                  geofenceSetMode
                    ? "bg-amber-100 border-amber-400 text-amber-700 font-semibold"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Target size={10} />
                {geofenceSetMode ? "📍 Click map to place center…" : "Click map to place center"}
              </button>
              {/* Pending geofence save/cancel */}
              {pendingGeofence && (
                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] text-amber-700 font-semibold mb-0.5">Pending center:</p>
                  <p className="text-[10px] text-amber-600 font-mono">
                    {pendingGeofence.lat.toFixed(5)}, {pendingGeofence.lng.toFixed(5)}
                  </p>
                  <p className="text-[10px] text-amber-600">Radius: {geofenceRadius}m</p>
                  <button
                    onClick={handleSaveGeofence}
                    disabled={savingGeofence}
                    className="w-full mt-1.5 py-1 bg-amber-500 text-white rounded text-[10px] font-semibold hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {savingGeofence ? "Saving…" : "✓ Save Geofence"}
                  </button>
                  <button
                    onClick={() => setPendingGeofence(null)}
                    className="w-full mt-0.5 py-0.5 text-gray-400 text-[10px] hover:text-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active leave list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 bg-gray-50 flex-shrink-0">
            Active Leaves ({activeLeaves.length})
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400 flex-shrink-0">Loading…</div>
          ) : activeLeaves.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400 flex-shrink-0">No active home leaves</div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
              {activeLeaves.map((leave) => {
                const mins = minutesSince(leave.lastLocationUpdate);
                const stale = mins !== null && mins > 30;
                return (
                  <button
                    key={leave.id}
                    onClick={() => handleMarkerClick(leave)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition ${
                      selectedLeave?.id === leave.id ? "bg-emerald-50 border-l-2 border-emerald-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                              {getInmateName(leave.inmateId)}
                              {alertedLeaveIds.has(leave.id) && (
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Geofence alert" />
                              )}
                            </p>
                          <p className="text-[10px] text-gray-400">{leave.inmateId}</p>
                        </div>
                      </div>
                      {stale && (
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" title="No update for 30+ min" />
                      )}
                    </div>
                    {leave.lastLocationUpdate ? (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={9} />
                        Last seen {formatRelativeTime(leave.lastLocationUpdate)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-1">No GPS yet</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Link
          to="/home-leave"
          className="text-xs text-indigo-600 hover:underline text-center flex-shrink-0 pb-2"
        >
          ← Back to Home Leave Management
        </Link>
      </div>

      {/* Map */}
      <div className={`flex-1 rounded-2xl overflow-hidden border shadow-sm relative ${
        geofenceSetMode ? "border-amber-400 ring-2 ring-amber-300" : "border-gray-200"
      }`}>
        {geofenceSetMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg pointer-events-none">
            📍 Click on the map to place the geofence center
          </div>
        )}
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
            Loading map…
          </div>
        ) : (
          <MapContainer
            center={mapCenter || [7.8731, 80.7718]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <MapController center={mapCenter} bounds={mapBounds} zoom={mapZoom} />
            <MapClickHandler active={geofenceSetMode} onMapClick={handleMapClick} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Markers for all leaves with position */}
            {leavesWithPosition.map((leave) => (
              <Marker
                key={leave.id}
                ref={(m) => {
                  if (m) {
                    markerRefs.current[leave.id] = m;
                  }
                }}
                position={[leave.lastKnownLat, leave.lastKnownLng]}
                icon={coloredIcon(STATUS_COLORS[leave.status] || "#6b7280", alertedLeaveIds.has(leave.id))}
                eventHandlers={{ click: () => handleMarkerClick(leave) }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[180px]">
                    <p className="font-bold text-sm">{getInmateName(leave.inmateId)}</p>
                    <p className="text-gray-500">{leave.inmateId}</p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span className={`font-semibold ${
                        leave.status === "ACTIVE" ? "text-green-600" :
                        leave.status === "REVOKED" ? "text-red-600" : "text-blue-600"
                      }`}>{leave.status}</span>
                    </p>
                    {leave.destinationAddress && (
                      <p><span className="font-medium">Dest:</span> {leave.destinationAddress}</p>
                    )}
                    {leave.lastLocationUpdate && (
                      <p className="text-gray-400">Updated: {formatTime(leave.lastLocationUpdate)}</p>
                    )}
                    {alertedLeaveIds.has(leave.id) && (
                      <p className="text-red-600 font-semibold mt-1">⚠️ Geofence alert active!</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* GPS track polylines for ALL active leaves — selected = highlighted */}
            {Object.entries(gpsHistories)
              .filter(([, pts]) => pts.length > 1)
              .map(([id, pts]) => {
                const isSelected = selectedLeave?.id === Number(id);
                return (
                  <Polyline
                    key={`track-${id}`}
                    positions={pts.map((p) => [p.latitude, p.longitude])}
                    pathOptions={
                      isSelected
                        ? { color: "#6366f1", weight: 4, opacity: 0.9, dashArray: "6,4" }
                        : { color: "#94a3b8", weight: 2, opacity: 0.55, dashArray: "4,4" }
                    }
                  />
                );
              })}

            {/* Pending geofence preview circle */}
            {pendingGeofence && (
              <Circle
                center={[pendingGeofence.lat, pendingGeofence.lng]}
                radius={geofenceRadius}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.15, weight: 2, dashArray: "5,5" }}
              />
            )}

            {/* Geofence circles - red when breached, blue when active, grey otherwise */}
            {leavesWithPosition
              .filter((l) => l.geofenceCenterLat && l.geofenceCenterLng && l.geofenceRadiusMeters)
              .map((leave) => (
                <Circle
                  key={`geofence-${leave.id}`}
                  center={[leave.geofenceCenterLat, leave.geofenceCenterLng]}
                  radius={leave.geofenceRadiusMeters}
                  pathOptions={{
                    color: alertedLeaveIds.has(leave.id) ? '#ef4444' : leave.status === 'ACTIVE' ? '#3b82f6' : '#9ca3af',
                    fillColor: alertedLeaveIds.has(leave.id) ? '#ef4444' : leave.status === 'ACTIVE' ? '#3b82f6' : '#9ca3af',
                    fillOpacity: 0.08,
                    weight: alertedLeaveIds.has(leave.id) ? 3 : 2,
                    dashArray: '5,5'
                  }}
                />
              ))}
          </MapContainer>
        )}

        {/* Legend Over Map */}
        <div className="absolute bottom-6 right-6 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 text-xs flex gap-4 items-center">
          <span className="font-semibold text-gray-700 mr-2 border-r border-gray-200 pr-3">Legend</span>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: c }} />
              <span className="text-gray-600 font-medium">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
            <span className="text-red-600 font-bold">Geofence Alert</span>
          </div>
        </div>
      </div>

      {/* Geofence Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-white animate-pulse" />
                <div>
                  <h2 className="text-lg font-bold">Critical Geofence Alerts</h2>
                  <p className="text-red-100 text-xs font-medium">Immediate action required for inmates outside allowed zones</p>
                </div>
              </div>
              <button onClick={() => setShowAlertsModal(false)} className="p-2 bg-red-700/50 hover:bg-red-700 rounded-lg transition text-white">
                <X size={20} />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid gap-4">
                {sortedAlerts.map((alert) => (
                  <div key={alert.id} className={`bg-white rounded-xl border-2 p-4 flex items-center justify-between shadow-sm ${alert.severity === "CRITICAL" ? "border-red-400" : "border-orange-300"}`}>
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${alert.severity === "CRITICAL" ? "bg-red-100" : "bg-orange-100"}`}>
                        <User size={24} className={alert.severity === "CRITICAL" ? "text-red-600" : "text-orange-600"} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-gray-500">{formatRelativeTime(alert.alertedAt)} • {formatTime(alert.alertedAt)}</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900">{getInmateName(alert.inmateId)}</h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Currently <span className="font-bold text-gray-900">{Math.round(alert.distanceFromCenter)}m</span> from center 
                          (allowed limit: <span className="font-medium">{Math.round(alert.allowedRadius)}m</span>)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleFocusAlert(alert);
                          setShowAlertsModal(false);
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                      >
                        <MapPin size={16} /> Locate
                      </button>
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                      >
                        <Check size={16} /> Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
