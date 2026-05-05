import React, { useState, useEffect, useRef } from "react";
import {
  Camera as CameraIcon,
  ShieldAlert,
  MonitorPlay,
  Settings,
  Activity,
  Power,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import { useCamera } from "../../../context/CameraContext";
import { useNavigate } from "react-router-dom";
import AlertFeed from "../../../components/AlertFeed"; // reusing the component

export default function CCTVGrid() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track which cameras are individually toggled ON (true) or OFF (false)
  const [activeCameras, setActiveCameras] = useState({});

  // AI Detection State
  const [isAiActive, setIsAiActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { videoRef, isCameraActive } = useCamera();
  const navigate = useNavigate();

  // Hidden references for processing the stream to the backend
  const canvasRef = useRef(null);
  const wsRefs = useRef({});
  const processingIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(() => {
    fetchCameras();

    // Ensure the main camera stream is active if the feed is intended for a slot
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        videoRef.current.play();
      } catch (e) {}
    }

    // Cleanup on unmount
    return () => {
        stopAiDetection();
        Object.values(wsRefs.current).forEach(ws => {
           if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
               ws.close();
           }
        });
    };
  }, [videoRef]);

  // Handle WebSocket connections dynamically based on active cameras
  useEffect(() => {
    if (!isAiActive) {
      Object.values(wsRefs.current).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      });
      wsRefs.current = {};
      return;
    }

    cameras.forEach(camera => {
      const isCamOn = activeCameras[camera.id] !== false;
      const currentWs = wsRefs.current[camera.id];

      if (isCamOn && (!currentWs || currentWs.readyState === WebSocket.CLOSED)) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/v1/ws/live/${camera.id}`);
        ws.binaryType = "arraybuffer";
        ws.onopen = () => console.log(`WebSocket Connected for Camera ${camera.id}`);
        ws.onerror = (e) => console.error(`WS Error for Camera ${camera.id}`, e);
        ws.onclose = () => console.log(`WebSocket Disconnected for Camera ${camera.id}`);
        wsRefs.current[camera.id] = ws;
      } else if (!isCamOn && currentWs) {
        currentWs.close();
        delete wsRefs.current[camera.id];
      }
    });
  }, [activeCameras, isAiActive, cameras]);

  const fetchCameras = async () => {
    try {
      const resp = await fetch("http://localhost:8003/api/v1/cameras/");
      if (resp.ok) {
        const data = await resp.json();
        const sorted = data.sort((a, b) =>
          a.location.localeCompare(b.location),
        );
        setCameras(sorted);

        // Initialize all fetched cameras to be "on"
        const initialActiveState = {};
        sorted.forEach((cam) => {
          initialActiveState[cam.id] = true;
        });
        setActiveCameras(initialActiveState);
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = (id) => {
    setActiveCameras((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const startAiDetection = async () => {
    if (!cameras || cameras.length === 0) {
      alert("No cameras configured to run against.");
      return;
    }

    // Auto-request camera permissions if the CameraContext feed isn't playing yet
    let stream = null;
    if (videoRef.current && videoRef.current.srcObject) {
      stream = videoRef.current.srcObject;
    } else {
      try {
        setIsConnecting(true);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {}
        }
      } catch (err) {
        alert(
          "Could not access Camera/Mic. Please allow permissions. Error: " +
            err.message,
        );
        setIsConnecting(false);
        return;
      }
    }

    if (!stream) {
      alert("Failed to acquire media stream.");
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    // The useEffect will handle opening the actual WebSockets
    setIsAiActive(true);
    setIsConnecting(false);
    startProcessing(stream);
  };

  const startProcessing = (stream) => {
    if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
    }

    // 1. Video Processing Loop
    processingIntervalRef.current = setInterval(() => {
      if (
        canvasRef.current &&
        videoRef.current
      ) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);

        canvasRef.current.toBlob(
          (blob) => {
            if (blob) {
              blob.arrayBuffer().then((buffer) => {
                const header = new Uint8Array([0x01]);
                const payload = new Uint8Array(buffer);
                const packet = new Uint8Array(header.length + payload.length);
                packet.set(header, 0);
                packet.set(payload, header.length);
                
                Object.values(wsRefs.current).forEach(ws => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(packet);
                    }
                });
              });
            }
          },
          "image/jpeg",
          0.8,
        );
      }
    }, 200); // 5 FPS

    // 2. Audio Processing (Web Audio API)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const header = new Uint8Array([0x02]); // 0x02 for Audio
        const payload = new Uint8Array(pcmData.buffer);
        const packet = new Uint8Array(header.length + payload.length);
        packet.set(header, 0);
        packet.set(payload, header.length);
        
        Object.values(wsRefs.current).forEach(ws => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(packet);
            }
        });
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    processorRef.current = processor;
  };

  const stopAiDetection = () => {
    setIsAiActive(false);

    if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
    }
  };

  // Determine grid layout based on camera count and whether AI side panel is open
  const getGridClass = (count) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-1 md:grid-cols-2";
    if (count <= 6) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <div className="h-full bg-slate-50 min-h-screen text-slate-900 p-4 md:p-6 lg:p-4 flex flex-col">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} width="640" height="480" className="hidden" />

      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
            <MonitorPlay className="text-blue-600 w-7 h-7" />
            CCTV Master Control
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Live monitoring dashboard.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3 mt-4 md:mt-0">
          <button
            onClick={isAiActive ? stopAiDetection : startAiDetection}
            disabled={isConnecting || cameras.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all ${
              isAiActive
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/50 blink-shadow"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20"
            } disabled:opacity-50`}
          >
            <Power
              size={16}
              className={isAiActive ? "animate-pulse delay-75" : ""}
            />
            {isConnecting
              ? "Connecting ..."
              : isAiActive
                ? "Stop Detection"
                : "Enable Detection"}
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium shadow-sm">
            <Activity size={16} className="text-emerald-500 animate-pulse" />
            System Online
          </div>

          <button
            onClick={() => navigate("/camera/management")}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 transition-colors px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium shadow-sm"
          >
            <Settings size={16} /> Manage
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Main Grid Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center animate-pulse">
                <CameraIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">
                  Connecting to camera streams...
                </p>
              </div>
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex items-center justify-center h-[60vh] bg-slate-100/50 rounded-2xl border border-slate-300 border-dashed">
              <div className="text-center max-w-sm">
                <ShieldAlert className="w-16 h-16 text-emerald-600 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  No Cameras Configured
                </h3>
                <p className="text-slate-500 mb-6 font-medium text-sm">
                  The CCTV system requires camera location records to generate
                  the grid.
                </p>
                <button
                  onClick={() => navigate("/camera/management")}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg shadow-blue-900/20 w-full transition-all"
                >
                  Configure Cameras Now
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-4 w-full h-full auto-rows-[300px] ${getGridClass(cameras.length)}`}
            >
              {cameras.map((camera) => {
                // To simulate a full CCTV system using the user's single webcam,
                // we'll clone the active device stream into every configured camera slot!
                const isCamOn = activeCameras[camera.id] !== false;
                const showLiveLocalStream =
                  isCamOn && (isCameraActive || isAiActive) && videoRef.current;

                return (
                  <div
                    key={camera.id}
                    className={`relative bg-white rounded-xl overflow-hidden border ${isAiActive && isCamOn ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-slate-200 shadow-sm"} group flex flex-col h-full transition-all`}
                  >
                    {/* Video Area */}
                    <div className="relative flex-1 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                      {showLiveLocalStream ? (
                        <video
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                          ref={(node) => {
                            if (
                              node &&
                              videoRef.current &&
                              videoRef.current.srcObject
                            ) {
                              node.srcObject = videoRef.current.srcObject;
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center pattern-lines pattern-slate-200 pattern-bg-transparent pattern-size-4 pattern-opacity-50">
                          <CameraIcon className="w-10 h-10 text-slate-400 mb-2" />
                          <span className="text-slate-600 font-mono text-xs uppercase font-bold tracking-widest bg-white/80 px-2 py-1 rounded shadow-sm">
                            No Signal
                          </span>
                        </div>
                      )}

                      {/* AI Bounding Box Overlay (simulated for effect if backend doesn't feed processed MJPEG natively to the grid yet) */}
                      {isAiActive && isCamOn && (
                        <div className="absolute inset-0 border-4 border-red-500/20 pointer-events-none"></div>
                      )}

                      {/* Overlay Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/20 text-[10px] font-mono font-bold uppercase tracking-wider text-white shadow-sm">
                          cam-{camera.id.toString().padStart(3, "0")}
                        </div>
                        {isAiActive && isCamOn && (
                          <div className="bg-red-600 backdrop-blur-md px-2 py-1 rounded border border-red-500 text-[10px] font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5 animate-pulse shadow-sm">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>{" "}
                            ACTIVE
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Bar */}
                    <div className="bg-white border-t border-slate-200 p-3 shrink-0 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {camera.location}
                        </h4>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                          {isCamOn ? camera.status : "Offline"} •{" "}
                          {showLiveLocalStream ? "Local Device" : "RTSP Target"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isAiActive && isCamOn && (
                          <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                        )}
                        <button
                          onClick={() => toggleCamera(camera.id)}
                          className={`flex items-center justify-center transition-colors ${isCamOn ? "text-emerald-500 hover:text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                          title={isCamOn ? "Turn Camera Off" : "Turn Camera On"}
                        >
                          {isCamOn ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Alert Feed */}
        {isAiActive && (
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="bg-red-50 border-b border-red-100 p-4 shrink-0 flex items-center justify-between">
              <h3 className="text-red-600 font-bold flex items-center gap-2">
                <ShieldAlert size={18} />
                Live Alerts
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <AlertFeed />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
