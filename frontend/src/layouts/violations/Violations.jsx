import React, { useState, useRef, useEffect } from 'react';
import { Video, Mic, StopCircle, ShieldAlert } from 'lucide-react';
import AlertFeed from '../../components/AlertFeed';
export default function Violations() {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Live Camera Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  // Stop everything on unmount
  useEffect(() => {
    return () => stopLiveStream();
  }, []);
  const startLiveStream = async () => {
      setLoading(true);
      try {
          console.log("Requesting camera access...");
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 640, height: 480 }, 
              audio: true 
          });
          
          console.log("Camera access granted. Setting up video...");
          if (videoRef.current) {
               videoRef.current.srcObject = stream;
               streamRef.current = stream;
               try {
                   await videoRef.current.play();
                   console.log("Video playing (hidden).");
               } catch (playErr) {
                   console.error("Error playing hidden video:", playErr);
               }
          }
          
          // Connect WS (Violation Service is on port 8003)
          console.log("Connecting to WebSocket on port 8003...");
          const ws = new WebSocket('ws://localhost:8003/api/v1/ws/live/99'); // ID 99 for Live Cam
          ws.binaryType = 'arraybuffer';
          
          ws.onopen = () => {
              console.log("WebSocket Connected. Starting stream processing...");
              setIsStreamActive(true);
              setLoading(false);
              startProcessing(stream, ws);
          };
          
          ws.onerror = (e) => {
              console.error("WS Error", e);
              alert("WebSocket connection error. Make sure the violation-service is running.");
              setLoading(false);
          };
          ws.onclose = () => {
              console.log("WebSocket Disconnected");
              if (isStreamActive) {
                  alert("Connection to violation-service lost.");
                  stopLiveStream();
              }
          };
          
          wsRef.current = ws;
      } catch (err) {
          console.error("Error accessing media devices:", err);
          alert("Could not access Camera/Mic. Please allow permissions. Error: " + err.message);
          setLoading(false);
      } 
  };
  const startProcessing = (stream, ws) => {
      // 1. Video Processing Loop
      const interval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && canvasRef.current && videoRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              ctx.drawImage(videoRef.current, 0, 0, 640, 480);
              
              canvasRef.current.toBlob((blob) => {
                  if (blob) {
                      blob.arrayBuffer().then(buffer => {
                           const header = new Uint8Array([0x01]);
                           const payload = new Uint8Array(buffer);
                           const packet = new Uint8Array(header.length + payload.length);
                           packet.set(header, 0);
                           packet.set(payload, header.length);
                           ws.send(packet);
                      });
                  }
              }, 'image/jpeg', 0.8);
          }
      }, 200); // 5 FPS
      
      // 2. Audio Processing (Web Audio API)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                  let s = Math.max(-1, Math.min(1, inputData[i]));
                  pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              const header = new Uint8Array([0x02]); // 0x02 for Audio
              const payload = new Uint8Array(pcmData.buffer);
              const packet = new Uint8Array(header.length + payload.length);
              packet.set(header, 0);
              packet.set(payload, header.length);
              ws.send(packet);
          }
      };
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;
  };
  const stopLiveStream = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
          wsRef.current.close();
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
      setIsStreamActive(false);
  };
  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-slate-900">Violation Detection</h1>
          </div>
          <p className="text-slate-600">AI-powered multimodal surveillance for unauthorized activities</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 aspect-video rounded-lg shadow-lg border border-slate-700 relative flex items-center justify-center overflow-hidden group">
               <div className="relative w-full h-full flex flex-col items-center justify-center">
                   {/* Hidden Elements for Processing */}
                   <video ref={videoRef} autoPlay playsInline muted className="hidden" />
                   <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                   
                   {isStreamActive ? (
                       <div className="relative w-full h-full">
                           {/* Display Backend Processed Feed (MJPEG) on port 8003 */}
                           <img 
                               src="http://localhost:8003/api/v1/video_feed" 
                               alt="Live Processed Feed" 
                               className="w-full h-full object-contain"
                           />
                           
                           <div className="absolute top-4 right-4 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 shadow-lg backdrop-blur-sm border border-red-500">
                               <div className="w-2 h-2 bg-white rounded-full"></div> AI PROCESSING ACTIVE
                           </div>
                           <button 
                             onClick={stopLiveStream}
                             className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-red-600/90 hover:bg-red-700 backdrop-blur-sm text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-semibold shadow-xl transition-all hover:scale-105"
                           >
                               <StopCircle size={20} /> Stop Analysis
                           </button>
                       </div>
                   ) : (
                       <div className="text-center p-8">
                           <ShieldAlert className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                           <h3 className="text-xl text-white font-medium mb-2">System Standby</h3>
                           <p className="text-slate-400 mb-6 max-w-sm mx-auto">Activate the AI violation detection models to monitor the camera feed for weapons, fights, and audio disturbances.</p>
                           <button 
                             onClick={startLiveStream}
                             disabled={loading}
                             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-3 mx-auto disabled:opacity-50 transition-all shadow-lg shadow-blue-900/50"
                           >
                             {loading ? 'Connecting to Models...' : <><Video size={20} /> <Mic size={20} /> Start Live Feed</>} 
                           </button>
                       </div>
                   )}
               </div>
            </div>
            
            {/* Stats / Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Detection Target" value="Weapons & Fights" icon="🎯" color="text-blue-600" />
                <StatCard label="Audio Analysis" value="Active (YAMNet)" icon="🌊" color="text-indigo-600" />
                <StatCard label="Model Status" value={isStreamActive ? "Running" : "Idle"} icon="⚡" color={isStreamActive ? "text-green-600" : "text-slate-500"} />
            </div>
          </div>
          {/* Right Sidebar: Alerts */}
          <div className="lg:col-span-1">
            <AlertFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
function StatCard({ label, value, icon, color = "text-slate-900" }) {
    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="text-2xl bg-slate-100 p-2 rounded-lg">{icon}</div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
        </div>
    )
}