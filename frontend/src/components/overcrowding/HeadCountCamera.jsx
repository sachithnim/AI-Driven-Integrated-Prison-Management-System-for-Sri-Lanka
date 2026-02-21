import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle, Eye, Activity } from 'lucide-react';
import axios from 'axios';

const HeadCountCamera = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [count, setCount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [isLiveMode, setIsLiveMode] = useState(false);
    const intervalRef = useRef(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            setIsStreaming(false);
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Handle Live Mode
    useEffect(() => {
        if (isLiveMode && isStreaming) {
            // Capture every 2 seconds
            intervalRef.current = setInterval(() => {
                if (!loading) {
                    captureAndDetect(true);
                }
            }, 2000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLiveMode, isStreaming]);

    const captureAndDetect = async (isAuto = false) => {
        if (!videoRef.current || !canvasRef.current) return;

        if (!isAuto) setLoading(true);
        setError(null);

        const context = canvasRef.current.getContext('2d');
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        canvasRef.current.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            try {
                const response = await axios.post('http://localhost:8002/api/v1/overcrowding/detect-head-count', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                setCount(response.data.count);
                if (response.data.image_base64) {
                    setProcessedImage(`data:image/jpeg;base64,${response.data.image_base64}`);
                }
            } catch (err) {
                console.error("Error detecting head count:", err);
                if (!isAuto) setError("Failed to detect head count. Is the AI service running?");
            } finally {
                if (!isAuto) setLoading(false);
            }
        }, 'image/jpeg');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Camera className="w-6 h-6 text-blue-600" />
                    Real-time Head Count & Heatmap
                </h2>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isLiveMode ? 'text-red-600' : 'text-gray-500'}`}>
                        {isLiveMode ? 'Live Monitoring On' : 'Live Monitoring Off'}
                    </span>
                    <button 
                        onClick={() => setIsLiveMode(!isLiveMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isLiveMode ? 'bg-red-600' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLiveMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Live Feed */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Live Feed
                    </div>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                    
                    {!isStreaming && !error && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Initializing camera...
                        </div>
                    )}
                </div>

                {/* AI Processed View */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Eye className="w-3 h-3" /> AI Heatmap View
                    </div>
                    {processedImage ? (
                        <img src={processedImage} alt="AI Analysis" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
                            <Activity className="w-8 h-8 opacity-50" />
                            <span>Waiting for analysis...</span>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <button
                    onClick={() => captureAndDetect(false)}
                    disabled={loading || !isStreaming || isLiveMode}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {loading ? 'Detecting...' : 'Capture Single Frame'}
                </button>

                {count !== null && (
                    <div className={`text-2xl font-bold ${count > 15 ? 'text-red-600' : 'text-green-600'} flex items-center gap-2`}>
                        {count > 15 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                        Count: {count}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeadCountCamera;
