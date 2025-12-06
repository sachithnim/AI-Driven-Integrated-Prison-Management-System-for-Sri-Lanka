import React, { useEffect } from 'react';
import { Camera as CameraIcon, Loader, AlertCircle, Play, Square } from 'lucide-react';
import { useCamera } from '../../context/CameraContext';

export default function Camera() {
  const {
    videoRef,
    streamRef,
    isLoading,
    isCameraActive,
    error,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    captureScreenshot,
    handleDeviceChange,
  } = useCamera();

  // Ensure video displays when returning to this page
  useEffect(() => {
    if (videoRef.current && streamRef && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [videoRef, streamRef, isCameraActive]);

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <CameraIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Security Monitoring</h1>
          </div>
          <p className="text-slate-600">Live camera feed for prison surveillance</p>
        </div>

        {/* Main Camera Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-center">
                      <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
                      <p className="text-white font-medium">Initializing camera...</p>
                    </div>
                  </div>
                )}

                {error && !isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 z-10 p-4">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                      <p className="text-red-100 font-medium text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
              </div>

              {/* Video Stats */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">
                    {isCameraActive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6 space-y-6">
              {/* Device Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Camera
                </label>
                {devices.length > 0 ? (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    disabled={isCameraActive}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm disabled:bg-slate-100"
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-500 p-2">No cameras found</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={isLoading || devices.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    View Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    <Square className="w-4 h-4" />
                    Stop Camera
                  </button>
                )}

                <button
                  onClick={captureScreenshot}
                  disabled={!isCameraActive}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  📷 Capture Image
                </button>
              </div>

              {/* Status Info */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                  Camera Status
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className={`font-semibold ${isCameraActive ? 'text-green-600' : 'text-red-600'}`}>
                      {isCameraActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Resolution:</span>
                    <span className="text-slate-700 font-medium">
                      {isCameraActive && videoRef.current?.videoWidth
                        ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cameras:</span>
                    <span className="text-slate-700 font-medium">{devices.length}</span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Note:</span> Camera feed runs in background across all pages. Use global API to access frame data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
