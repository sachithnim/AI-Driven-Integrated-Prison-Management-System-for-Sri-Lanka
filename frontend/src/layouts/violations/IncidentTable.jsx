import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Search,
  CalendarDays,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";

export default function IncidentTable() {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  useEffect(() => {
    fetchCameras();
    fetchIncidents();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await fetch("http://localhost:8003/api/v1/cameras/");
      if (response.ok) {
        const data = await response.json();
        const cameraMap = {};
        data.forEach((cam) => {
          cameraMap[cam.id] = cam.location;
        });
        setCameras(cameraMap);
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
    }
  };

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (severityFilter) params.set("severity", severityFilter);

      const response = await fetch(`http://localhost:8003/api/v1/incidents/?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      } else {
        console.error("Failed to fetch incidents");
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, searchQuery, severityFilter]);

  // Re-fetch when filters change (with debounce for search)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchIncidents();
    }, searchQuery ? 400 : 0); // Debounce search input

    return () => clearTimeout(timeout);
  }, [dateFrom, dateTo, severityFilter, searchQuery, fetchIncidents]);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setSeverityFilter("");
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || severityFilter;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "High":
        return "text-red-500 bg-red-100 border-red-200";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      default:
        return "text-blue-500 bg-blue-100 border-blue-200";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden mt-8">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Incident Logs
          </h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-lg shadow-sm transition-colors"
              >
                <X size={14} /> Clear Filters
              </button>
            )}
            <button
              onClick={fetchIncidents}
              className="flex items-center gap-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by description, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Date From */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              <CalendarDays size={12} className="inline mr-1" />
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            />
          </div>

          {/* Date To */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              <CalendarDays size={12} className="inline mr-1" />
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
            />
          </div>

          {/* Severity Filter */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              <Filter size={12} className="inline mr-1" />
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Filter size={12} />
            <span>
              Showing {loading ? "..." : incidents.length} results
              {searchQuery && (
                <span className="ml-1">
                  matching "<strong>{searchQuery}</strong>"
                </span>
              )}
              {dateFrom && (
                <span className="ml-1">
                  from <strong>{dateFrom}</strong>
                </span>
              )}
              {dateTo && (
                <span className="ml-1">
                  to <strong>{dateTo}</strong>
                </span>
              )}
              {severityFilter && (
                <span className="ml-1">
                  • severity: <strong>{severityFilter}</strong>
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
              <th className="p-4 font-semibold">Time</th>
              <th className="p-4 font-semibold">Location</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Severity</th>
              <th className="p-4 font-semibold">Details</th>
              <th className="p-4 font-semibold text-right">Evidence</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800 divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    Loading incidents...
                  </div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  {hasActiveFilters
                    ? "No incidents match the current filters."
                    : "No incidents found in the database."}
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <React.Fragment key={incident.id}>
                  <tr
                    className={`hover:bg-slate-50 transition-colors ${expandedId === incident.id ? "bg-slate-50" : ""}`}
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={14} />
                        {new Date(incident.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      {cameras[incident.camera_id] ||
                        `CAM-${incident.camera_id}`}
                    </td>
                    <td className="p-4">{incident.type}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(incident.severity)}`}
                      >
                        {incident.severity}
                      </span>
                    </td>
                    <td
                      className="p-4 max-w-xs truncate"
                      title={incident.description}
                    >
                      {incident.description}
                    </td>
                    <td className="p-4 text-right">
                      {incident.video_path ? (
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === incident.id ? null : incident.id,
                            )
                          }
                          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          <Video size={14} /> View Clip
                          {expandedId === incident.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          No Video
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Video Row */}
                  {expandedId === incident.id && incident.video_path && (
                    <tr className="bg-slate-900 border-t-0 p-0">
                      <td colSpan="6" className="p-0">
                        <div className="p-6 flex justify-center bg-gradient-to-b from-slate-800 to-slate-900 shadow-inner">
                          <div className="w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-slate-700/50 shadow-2xl relative">
                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded capitalize z-10 flex items-center gap-1 opacity-80 hover:opacity-100">
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                              INCIDENT RECORDING
                            </div>
                            <video
                              controls
                              autoPlay
                              className="w-full aspect-video object-contain"
                              src={incident.video_path}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
