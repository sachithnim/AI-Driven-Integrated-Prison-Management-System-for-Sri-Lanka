import React, { useState, useEffect } from "react";
import {
  Camera,
  Plus,
  MapPin,
  Search,
  Activity,
  Trash2,
  Edit,
} from "lucide-react";

export default function CameraManagement() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const resp = await fetch("http://localhost:8003/api/v1/cameras/");
      if (resp.ok) {
        const data = await resp.json();
        setCameras(data.sort((a, b) => a.location.localeCompare(b.location)));
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!newLocation.trim() || !selectedDeviceId) {
      alert(
        "Please provide both a location name and select a hardware camera.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch("http://localhost:8003/api/v1/cameras/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Notice we are assuming the backend schema still accepts just 'location'.
        // To truly bind it to hardware, the backend should eventually save the `deviceId` too.
        // For now, we combine them into the location label for demonstration, or just save the location.
        body: JSON.stringify({
          location: `${newLocation} (${selectedDeviceId.substring(0, 8)}...)`,
        }),
      });
      if (resp.ok) {
        const newCamera = await resp.json();
        setCameras((prev) =>
          [...prev, newCamera].sort((a, b) =>
            a.location.localeCompare(b.location),
          ),
        );
        setNewLocation("");
        setSelectedDeviceId("");
        setIsAdding(false);
      } else {
        alert(
          "Failed to create camera allocation. Does this location already exist?",
        );
      }
    } catch (error) {
      console.error("Error creating camera:", error);
      alert("Error networking with backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddForm = async () => {
    setIsAdding(true);
    try {
      // Must request permissions first in an interactive flow before enumerateDevices will show labels
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );
      setAvailableDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error("Camera access denied or failed:", error);
      alert(
        "We need camera permission to list your available hardware devices.",
      );
      setIsAdding(false);
    }
  };

  const filteredCameras = cameras.filter(
    (cam) =>
      cam.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.id.toString().includes(searchTerm),
  );

  return (
    <div className="h-full bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-600" />
              Camera Allocations
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Manage your physical camera locations and backend stream IDs.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <button
              onClick={isAdding ? () => setIsAdding(false) : openAddForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> {isAdding ? "Cancel" : "Add New Location"}
            </button>
          </div>
        </div>

        {/* Add Camera Form Widget */}
        {isAdding && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" /> Allocate New Camera
            </h2>
            <form
              onSubmit={handleCreateCamera}
              className="flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Location Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cell Block A, North Yard..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Hardware Camera Source
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                    required
                  >
                    <option value="" disabled>
                      Select an available camera...
                    </option>
                    {availableDevices.map((device, i) => (
                      <option
                        key={device.deviceId || i}
                        value={device.deviceId}
                      >
                        {device.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium w-full md:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newLocation.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 w-full md:w-auto"
                >
                  {isSubmitting ? "Saving..." : "Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tools and Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by location or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total Allocations: {cameras.length}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Camera ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Location Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Hardware Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Loading cameras...
                    </td>
                  </tr>
                ) : filteredCameras.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Camera className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-lg">
                          No cameras found.
                        </p>
                        <p className="text-slate-400 text-sm">
                          Create a new allocation to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCameras.map((camera) => (
                    <tr
                      key={camera.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 font-mono">
                          CAM-{camera.id.toString().padStart(3, "0")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-blue-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {camera.location}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {camera.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 text-slate-400">
                          <button
                            className="hover:text-blue-600 transition-colors"
                            title="Edit (Coming Soon)"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="hover:text-red-600 transition-colors"
                            title="Delete (Coming Soon)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
