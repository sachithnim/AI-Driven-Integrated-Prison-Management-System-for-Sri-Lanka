import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { AlertTriangle, ShieldCheck, Play, Video } from "lucide-react";
export default function AlertFeed() {
  const [alerts, setAlerts] = useState([]);
  const socketUrl = "ws://localhost:8003/api/v1/ws/alerts";
  const { lastMessage } = useWebSocket(socketUrl, {
    shouldReconnect: (closeEvent) => true,
  });
  useEffect(() => {
    if (lastMessage !== null) {
      const newAlert = JSON.parse(lastMessage.data);
      setAlerts([newAlert]); // Keep only the latest 1 alert
    }
  }, [lastMessage]);
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200 h-[600px] overflow-y-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <ActivityIcon /> Live Alerts
      </h2>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-slate-500 text-center py-10">
            No alerts yet...
          </div>
        )}
        {alerts.map((alert, idx) => (
          <AlertCard key={idx} alert={alert} />
        ))}
      </div>
    </div>
  );
}
function ActivityIcon() {
  return <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />;
}
function AlertCard({ alert }) {
  const isHigh = alert.level === "High";
  const isMed = alert.level === "Medium";
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div
      className={`p-3 rounded-md border-l-4 ${isHigh ? "border-red-500 bg-red-50" : isMed ? "border-yellow-500 bg-yellow-50" : "border-blue-500 bg-blue-50"}`}
    >
      <div className="flex justify-between items-start">
        <h3
          className={`font-bold ${isHigh ? "text-red-600" : isMed ? "text-yellow-600" : "text-blue-600"}`}
        >
          {alert.level} Level Alert
        </h3>
        <span className="text-xs text-slate-500">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-2 mb-1">
          <div className="flex justify-between">
            <span>Weapon: {alert.weapon_name || "None"}</span>
            <span className={alert.fight_score > 0.3 ? "text-red-600 font-semibold" : "text-slate-500"}>
              Fight: {alert.fight_score > 0.3 ? "Fight" : "Non-fight"}
            </span>
            <span>Audio: {alert.audio_name || "None"}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Location: {alert.camera_location || "Unknown"}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-slate-500 font-medium">Cam ID: {alert.camera_id}</span>
          {alert.weapon_name && (
            <span className="text-red-700 font-bold border border-red-200 px-2 py-0.5 rounded bg-red-100">
              Detected: {alert.weapon_name}
            </span>
          )}
        </div>
        {alert.incident_id && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded text-slate-700 transition-colors text-xs shadow-sm"
            >
              <Video size={14} /> {showVideo ? "Hide Clip" : "View Clip"}
            </button>
            {showVideo && (
              <div className="mt-2 rounded overflow-hidden border border-slate-200 bg-black relative shadow-sm">
                <video
                  controls
                  autoPlay
                  className="w-full"
                  src={`http://localhost:8003/static/incidents/incident_${alert.incident_id}.webm`}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="text-[10px] text-slate-600 text-center py-1 bg-slate-100 border-t border-slate-200">
                  Clip is ready ~10s after alert.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
