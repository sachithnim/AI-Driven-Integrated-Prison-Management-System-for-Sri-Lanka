import React, { useState, useEffect } from "react";
import {
  Video,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function IncidentTable() {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  const fetchIncidents = async () => {
    try {
      const response = await fetch(
        "http://localhost:8003/api/v1/incidents/?limit=20",
      );
      if (response.ok) {
        const data = await response.json();
        // Sort descending by timestamp assuming backend doesn't
        const sorted = data.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
        setIncidents(sorted);
      } else {
        console.error("Failed to fetch incidents");
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="text-red-500" /> Recent Incidents Logging
        </h2>
        <button
          onClick={fetchIncidents}
          className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded shadow-sm transition-colors"
        >
          Refresh List
        </button>
      </div>

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
                  Loading incidents...
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  No localized incidents found in the database.
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
                              src={`http://localhost:8003${incident.video_path}`}
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
