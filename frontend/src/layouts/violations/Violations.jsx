import React from "react";
import { ShieldAlert, MonitorPlay, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Violations() {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Violation Detection Upgraded
        </h1>

        <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          The live AI-powered Violence, Weapon, and Anomaly Detection system has
          been integrated natively into the{" "}
          <strong className="text-slate-800">
            CCTV Master Control Dashboard
          </strong>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate("/camera/cctv")}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all group"
          >
            <MonitorPlay className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Open CCTV Dashboard
          </button>

          <button
            onClick={() => navigate("/incidents")}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold border border-slate-300 transition-all"
          >
            <History className="w-5 h-5" />
            View Past Incidents
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-sm text-slate-400">
            You can start AI tracking automatically for any allocated camera
            from the Master Control grid.
          </p>
        </div>
      </div>
    </div>
  );
}
