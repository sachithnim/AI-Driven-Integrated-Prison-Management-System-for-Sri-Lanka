import React from "react";
import IncidentTable from "./IncidentTable";
import { AlertCircle } from "lucide-react";

export default function Incidents() {
  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Incident Logs</h1>
          </div>
          <p className="text-slate-600">
            Review historical AI-detected incidents and video evidence.
          </p>
        </div>

        <IncidentTable />
      </div>
    </div>
  );
}
