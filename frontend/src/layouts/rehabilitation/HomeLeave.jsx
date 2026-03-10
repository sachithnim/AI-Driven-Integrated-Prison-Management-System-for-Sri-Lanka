import React, { useState, useEffect } from "react";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import toast from "react-hot-toast";
import {
  Home,
  MapPin,
  Plus,
  Check,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Navigation,
  RefreshCw,
  User,
  Calendar,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800",  icon: Clock         },
  APPROVED:  { label: "Approved",  color: "bg-blue-100 text-blue-800",      icon: CheckCircle   },
  ACTIVE:    { label: "Active",    color: "bg-green-100 text-green-800",    icon: Navigation    },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-700",      icon: CheckCircle   },
  REVOKED:   { label: "Revoked",   color: "bg-red-100 text-red-800",        icon: AlertTriangle },
  DENIED:    { label: "Denied",    color: "bg-red-100 text-red-700",        icon: XCircle       },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

const emptyForm = {
  inmateId: "",
  startDate: "",
  endDate: "",
  reason: "",
  destinationAddress: "",
  contactPhone: "",
  conditions: "",
  gpsRequired: true,
};

export default function HomeLeave() {
  const [leaves, setLeaves]   = useState([]);
  const [inmates, setInmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionModal, setActionModal] = useState(null); // { type, leaveId, notes, officerId }

  const load = async () => {
    setLoading(true);
    try {
      const [data, inmatesData] = await Promise.all([
        BackendRehabService.getAllHomeLeaves(),
        InmateService.getAllInmates(),
      ]);
      setLeaves(data);
      setInmates(inmatesData);
    } catch (e) {
      toast.error("Failed to load home leave data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.inmateId || !form.startDate || !form.endDate || !form.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await BackendRehabService.requestHomeLeave({
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate:   new Date(form.endDate).toISOString(),
      });
      toast.success("Home leave request submitted");
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { type, leaveId, notes, officerId } = actionModal;
    try {
      if (type === "approve")   await BackendRehabService.approveHomeLeave(leaveId, officerId, notes);
      if (type === "deny")      await BackendRehabService.denyHomeLeave(leaveId, officerId, notes);
      if (type === "activate")  await BackendRehabService.activateHomeLeave(leaveId);
      if (type === "complete")  await BackendRehabService.completeHomeLeave(leaveId);
      if (type === "revoke")    await BackendRehabService.revokeHomeLeave(leaveId, officerId, notes);
      toast.success(`Home leave ${type}d successfully`);
      setActionModal(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} home leave`);
    }
  };

  const getInmate = (id) => {
    const sid = String(id);
    return inmates.find((i) => String(i.id) === sid || String(i.inmateId) === sid) || null;
  };

  const getInmateName = (id) => {
    const inm = getInmate(id);
    if (!inm) return null;
    return `${inm.firstName || ""} ${inm.lastName || ""}`.trim() || null;
  };

  const filtered = filterStatus === "ALL" ? leaves : leaves.filter((l) => l.status === filterStatus);

  const stats = {
    pending:   leaves.filter((l) => l.status === "PENDING").length,
    active:    leaves.filter((l) => l.status === "ACTIVE").length,
    approved:  leaves.filter((l) => l.status === "APPROVED").length,
    total:     leaves.length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="text-indigo-600" size={26} />
            Home Leave Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage inmate home leave requests and GPS monitoring</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            <Plus size={14} /> New Request
          </button>
          <Link
            to="/home-leave/map"
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
          >
            <MapPin size={14} /> Live Map
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.total,    color: "text-gray-700",   bg: "bg-white" },
          { label: "Pending",        value: stats.pending,  color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Approved",       value: stats.approved, color: "text-blue-700",   bg: "bg-blue-50" },
          { label: "Active Now",     value: stats.active,   color: "text-green-700",  bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {["ALL", "PENDING", "APPROVED", "ACTIVE", "COMPLETED", "REVOKED", "DENIED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition ${
              filterStatus === s
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label}
            {s !== "ALL" && (
              <span className="ml-1 text-[10px] opacity-75">
                ({leaves.filter((l) => l.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Home size={36} className="mb-2 opacity-40" />
            <p className="text-sm">No home leave records found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "Inmate", "Start", "End", "Days", "Destination", "Status", "GPS", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{leave.id}</td>
                  <td className="px-4 py-3">
                    {getInmateName(leave.inmateId) ? (
                      <div className="font-medium text-gray-900">{getInmateName(leave.inmateId)}</div>
                    ) : (
                      <div className="font-medium text-gray-400 italic text-sm">Unknown Inmate</div>
                    )}
                    <div className="text-xs text-gray-400 font-mono">ID: {leave.inmateId}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">
                    {leave.durationDays ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                    {leave.destinationAddress || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={leave.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {leave.gpsRequired ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <MapPin size={10} /> GPS
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Status transitions */}
                      {leave.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setActionModal({ type: "approve", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "deny", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Deny"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {leave.status === "APPROVED" && (
                        <>
                          <button
                            onClick={() => setActionModal({ type: "activate", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Mark as Active (departed)"
                          >
                            <Navigation size={14} />
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "revoke", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Revoke"
                          >
                            <AlertTriangle size={14} />
                          </button>
                        </>
                      )}
                      {leave.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => setActionModal({ type: "complete", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="Mark Returned"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "revoke", leaveId: leave.id, notes: "", officerId: "admin" })}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Emergency Revoke"
                          >
                            <AlertTriangle size={14} />
                          </button>
                          <Link
                            to={`/home-leave/map?leaveId=${leave.id}`}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Track on Map"
                          >
                            <MapPin size={14} />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Home size={18} className="text-indigo-600" /> New Home Leave Request
              </h2>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Inmate */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <User size={11} className="inline mr-1" /> Inmate *
                </label>
                <select
                  value={form.inmateId}
                  onChange={(e) => setForm({ ...form, inmateId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">Select inmate…</option>
                  {inmates.map((i) => {
                    const fullName = `${i.firstName || ""} ${i.lastName || ""}`.trim();
                    const iid = i.id || i.inmateId;
                    return (
                      <option key={iid} value={iid}>
                        {fullName ? `${fullName} (ID: ${iid})` : `ID: ${iid}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    <Calendar size={11} className="inline mr-1" /> Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    <Calendar size={11} className="inline mr-1" /> End Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  placeholder="Reason for home leave…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  required
                />
              </div>

              {/* Destination & Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <MapPin size={11} className="inline mr-1" /> Destination Address
                </label>
                <input
                  type="text"
                  value={form.destinationAddress}
                  onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
                  placeholder="123 Main St, Colombo…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Phone size={11} className="inline mr-1" /> Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="+94 77 123 4567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Conditions */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Conditions / Restrictions</label>
                <textarea
                  value={form.conditions}
                  onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                  rows={2}
                  placeholder="Must return by 8PM, no alcohol, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* GPS Required toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.gpsRequired}
                  onChange={(e) => setForm({ ...form, gpsRequired: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Require GPS tracking during leave</span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(emptyForm); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 capitalize mb-3">
              {actionModal.type === "approve" && "Approve Home Leave"}
              {actionModal.type === "deny" && "Deny Home Leave"}
              {actionModal.type === "activate" && "Mark as Active (Inmate Departed)"}
              {actionModal.type === "complete" && "Mark as Completed (Inmate Returned)"}
              {actionModal.type === "revoke" && "Revoke Home Leave"}
            </h3>

            {["approve", "deny", "revoke"].includes(actionModal.type) && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Officer ID</label>
                  <input
                    type="text"
                    value={actionModal.officerId}
                    onChange={(e) => setActionModal({ ...actionModal, officerId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
                  <textarea
                    value={actionModal.notes}
                    onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition ${
                  actionModal.type === "revoke" || actionModal.type === "deny"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
