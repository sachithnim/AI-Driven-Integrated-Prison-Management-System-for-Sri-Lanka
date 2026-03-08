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
      setAlerts((prev) => [newAlert, ...prev].slice(0, 50)); // Keep last 50
    }
  }, [lastMessage]);
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-700 h-[600px] overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <ActivityIcon /> Live Alerts
      </h2>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-slate-400 text-center py-10">
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
      className={`p-3 rounded-md border-l-4 ${isHigh ? "border-red-500 bg-red-900/20" : isMed ? "border-yellow-500 bg-yellow-900/20" : "border-blue-500 bg-blue-900/20"}`}
    >
      <div className="flex justify-between items-start">
        <h3
          className={`font-bold ${isHigh ? "text-red-400" : isMed ? "text-yellow-400" : "text-blue-400"}`}
        >
          {alert.level} Level Alert
        </h3>
        <span className="text-xs text-slate-400">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-slate-300 text-sm mt-1">{alert.message}</p>
      <div className="mt-2 text-xs text-slate-400 flex flex-col gap-1">
        <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
          <span>Weapon: {(alert.weapon_score || 0).toFixed(2)}</span>
          <span>Fight: {(alert.fight_score || 0).toFixed(2)}</span>
          <span>Audio: {(alert.audio_score || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-slate-500">Cam ID: {alert.camera_id}</span>
          {alert.weapon_name && (
            <span className="text-red-400 font-bold border border-red-900 px-2 py-0.5 rounded bg-red-900/20">
              Detected: {alert.weapon_name}
            </span>
          )}
        </div>
        {alert.incident_id && (
          <div className="mt-2 border-t border-slate-700/50 pt-2">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-200 transition-colors text-xs"
            >
              <Video size={14} /> {showVideo ? "Hide Clip" : "View Clip"}
            </button>
            {showVideo && (
              <div className="mt-2 rounded overflow-hidden border border-slate-700 bg-black relative">
                <video
                  controls
                  autoPlay
                  className="w-full"
                  src={`http://localhost:8003/static/incidents/incident_${alert.incident_id}.webm`}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="text-[10px] text-slate-500 text-center py-1 bg-slate-800">
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
