import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import BackendRehabService from '../../services/rehab/backendRehabService';

/**
 * Mobile-friendly GPS Reporter Page
 * Inmates use this page (on a phone) to auto-send GPS coordinates.
 * URL: /gps-reporter/:leaveId
 */
export default function GPSReporter() {
    const [leaveId, setLeaveId] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, tracking, error, success
    const [lastUpdate, setLastUpdate] = useState(null);
    const [position, setPosition] = useState(null);
    const [error, setError] = useState(null);
    const [geofenceInfo, setGeofenceInfo] = useState(null);
    const [updateCount, setUpdateCount] = useState(0);
    const [intervalId, setIntervalId] = useState(null);

    const sendLocation = useCallback(async () => {
        if (!leaveId || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy, speed } = pos.coords;
                setPosition({ latitude, longitude, accuracy });
                setError(null);

                try {
                    const result = await BackendRehabService.updateGPSLocation(leaveId, {
                        latitude,
                        longitude,
                        accuracy,
                        speedKmh: speed ? (speed * 3.6).toFixed(1) : null,
                        deviceId: 'mobile-web-' + navigator.userAgent.slice(0, 20),
                    });

                    setLastUpdate(new Date().toLocaleTimeString());
                    setUpdateCount(prev => prev + 1);
                    setStatus('success');

                    // Geofence feedback
                    if (result.distanceFromCenter !== undefined) {
                        setGeofenceInfo({
                            distance: result.distanceFromCenter,
                            radius: result.allowedRadius,
                            withinBoundary: result.withinBoundary,
                            alert: result.alert,
                            alertSeverity: result.alertSeverity,
                        });
                    }
                } catch (err) {
                    setStatus('error');
                    setError('Failed to send location: ' + (err.response?.data?.message || err.message));
                }
            },
            (geoErr) => {
                setStatus('error');
                setError('GPS Error: ' + geoErr.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [leaveId]);

    const startTracking = () => {
        if (!leaveId) {
            setError('Please enter a Home Leave ID');
            return;
        }
        if (!navigator.geolocation) {
            setError('Your browser does not support GPS. Please use a modern browser.');
            return;
        }
        setIsTracking(true);
        setStatus('tracking');
        setError(null);
        sendLocation(); // immediate first update
        const id = setInterval(sendLocation, 10000); // every 10 seconds
        setIntervalId(id);
    };

    const stopTracking = () => {
        setIsTracking(false);
        setStatus('idle');
        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }
    };

    useEffect(() => {
        // Extract leaveId from URL if present
        const path = window.location.pathname;
        const match = path.match(/\/gps-reporter\/(\d+)/);
        if (match) setLeaveId(match[1]);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    const geofencePercentage = geofenceInfo ? Math.round((geofenceInfo.distance / geofenceInfo.radius) * 100) : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 flex flex-col items-center">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 mt-4">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                    <h1 className="text-2xl font-bold">GPS Location Reporter</h1>
                    <p className="text-slate-400 text-sm mt-1">PMS Inmate Tracking System</p>
                </div>

                {/* Leave ID Input */}
                {!isTracking && (
                    <div className="bg-slate-800 rounded-xl p-6 mb-4 border border-slate-700">
                        <label className="block text-sm text-slate-400 mb-2">Home Leave ID</label>
                        <input
                            type="number"
                            value={leaveId}
                            onChange={(e) => setLeaveId(e.target.value)}
                            className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg p-3 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter Leave ID"
                        />
                    </div>
                )}

                {/* Start/Stop Button */}
                <button
                    onClick={isTracking ? stopTracking : startTracking}
                    className={`w-full py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 transition-all duration-300 ${
                        isTracking
                            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {isTracking ? (
                        <>
                            <WifiOff className="w-5 h-5" /> Stop Tracking
                        </>
                    ) : (
                        <>
                            <Wifi className="w-5 h-5" /> Start GPS Tracking
                        </>
                    )}
                </button>

                {/* Status Panel */}
                {isTracking && (
                    <div className="mt-6 space-y-4">
                        {/* Live Status */}
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-3 h-3 rounded-full ${status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500'} animate-pulse`}></div>
                                <span className="text-sm font-medium text-slate-300">
                                    {status === 'success' ? 'Location Sent' : status === 'error' ? 'Error' : 'Sending...'}
                                </span>
                            </div>

                            {position && (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500">Latitude</span>
                                        <p className="font-mono">{position.latitude.toFixed(6)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Longitude</span>
                                        <p className="font-mono">{position.longitude.toFixed(6)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Accuracy</span>
                                        <p className="font-mono">{position.accuracy?.toFixed(0)}m</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Updates</span>
                                        <p className="font-mono">{updateCount}</p>
                                    </div>
                                </div>
                            )}

                            {lastUpdate && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" /> Last update: {lastUpdate}
                                </div>
                            )}
                        </div>

                        {/* Geofence Status */}
                        {geofenceInfo && (
                            <div className={`rounded-xl p-4 border ${
                                geofenceInfo.alert && geofenceInfo.alertSeverity === 'CRITICAL'
                                    ? 'bg-red-900/30 border-red-600'
                                    : geofenceInfo.alert
                                    ? 'bg-yellow-900/30 border-yellow-600'
                                    : 'bg-green-900/30 border-green-600'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {geofenceInfo.withinBoundary ? (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    )}
                                    <span className="font-semibold">
                                        {geofenceInfo.withinBoundary ? 'Within Boundary' : '⚠ OUTSIDE BOUNDARY'}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <p>Distance: <span className="font-mono">{geofenceInfo.distance}m</span> / {geofenceInfo.radius}m</p>
                                    {/* Progress bar */}
                                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                geofencePercentage > 100 ? 'bg-red-500' : geofencePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{ width: `${Math.min(geofencePercentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{geofencePercentage}% of allowed radius</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-900/30 border border-red-600 rounded-xl p-4 text-red-300 text-sm">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        {error}
                    </div>
                )}

                {/* Info Footer */}
                <div className="mt-8 text-center text-xs text-slate-600">
                    <p>Location updates every 10 seconds</p>
                    <p>Keep this page open during your leave period</p>
                </div>
            </div>
        </div>
    );
}
