import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import { MapPin, Navigation, RefreshCw, User, Clock, AlertTriangle } from "lucide-react";
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
function coloredIcon(color) {
  return new L.DivIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      transform:rotate(-45deg);
    "></div>`,
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

// Component to recenter map when needed
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13, { animate: true });
  }, [center, map]);
  return null;
}

export default function InmateMapView() {
  const [searchParams] = useSearchParams();
  const focusLeaveId = searchParams.get("leaveId") ? Number(searchParams.get("leaveId")) : null;

  const [activeLeaves, setActiveLeaves] = useState([]);
  const [allLeaves, setAllLeaves]       = useState([]);
  const [inmates, setInmates]           = useState([]);
  const [gpsHistories, setGpsHistories] = useState({}); // leaveId → GPSLocation[]
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [mapCenter, setMapCenter] = useState([7.8731, 80.7718]); // Sri Lanka centre
  const autoRefreshRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [active, all, inmatesData] = await Promise.all([
        BackendRehabService.getActiveHomeLeaves(),
        BackendRehabService.getAllHomeLeaves(),
        InmateService.getAllInmates(),
      ]);
      setActiveLeaves(active);
      setAllLeaves(all);
      setInmates(inmatesData);

      // Load GPS history for all active leaves
      const histories = {};
      await Promise.all(
        active.map(async (leave) => {
          try {
            histories[leave.id] = await BackendRehabService.getGPSHistory(leave.id);
          } catch {
            histories[leave.id] = [];
          }
        })
      );
      setGpsHistories(histories);

      // Focus on specified leave if provided
      if (focusLeaveId) {
        const target = all.find((l) => l.id === focusLeaveId);
        if (target?.lastKnownLat && target?.lastKnownLng) {
          setMapCenter([target.lastKnownLat, target.lastKnownLng]);
        }
        setSelectedLeave(target || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [focusLeaveId]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    autoRefreshRef.current = setInterval(loadData, 30_000);
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
    }
  };

  const leavesWithPosition = allLeaves.filter((l) => l.lastKnownLat && l.lastKnownLng);

  const formatTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString();
  };

  const minutesSince = (iso) => {
    if (!iso) return null;
    return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left panel */}
      <div className="w-80 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
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

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1.5">
          <p className="font-semibold text-gray-600 mb-2">Map Legend</p>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: c }} />
              <span className="text-gray-600">{s}</span>
            </div>
          ))}
        </div>

        {/* Active leave list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 bg-gray-50">
            Active Leaves ({activeLeaves.length})
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
          ) : activeLeaves.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No active home leaves</div>
          ) : (
            <div className="divide-y divide-gray-100">
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
                          <p className="text-xs font-semibold text-gray-800">{getInmateName(leave.inmateId)}</p>
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
                        Last seen {mins !== null ? `${mins} min ago` : "—"}
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

        {/* Selected leave detail */}
        {selectedLeave && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1.5">
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
            </div>
          </div>
        )}

        <Link
          to="/rehabilitation/home-leave"
          className="text-xs text-indigo-600 hover:underline text-center"
        >
          ← Back to Home Leave Management
        </Link>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
            Loading map…
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <RecenterMap center={mapCenter} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Markers for all leaves with position */}
            {leavesWithPosition.map((leave) => (
              <Marker
                key={leave.id}
                position={[leave.lastKnownLat, leave.lastKnownLng]}
                icon={coloredIcon(STATUS_COLORS[leave.status] || "#6b7280")}
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
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* GPS track polyline for selected leave */}
            {selectedLeave && (gpsHistories[selectedLeave.id] || []).length > 1 && (
              <Polyline
                positions={(gpsHistories[selectedLeave.id] || []).map((p) => [p.latitude, p.longitude])}
                pathOptions={{ color: "#6366f1", weight: 3, opacity: 0.8, dashArray: "6,4" }}
              />
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
