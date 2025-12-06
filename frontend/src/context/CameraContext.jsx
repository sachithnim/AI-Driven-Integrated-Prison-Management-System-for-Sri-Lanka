import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

const CameraContext = createContext();

export const CameraProvider = ({ children }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [frameData, setFrameData] = useState(null);
  const frameIntervalRef = useRef(null);

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(track => track.stop());

        // Now enumerate devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');

        if (videoDevices.length > 0) {
          setDevices(videoDevices);
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
        setError('Camera permission denied. Please allow camera access in browser settings.');
      }
    };
    getDevices();
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!selectedDeviceId) {
        setError('No camera device selected');
        setIsLoading(false);
        return;
      }

      const constraints = {
        video: {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraActive(true);
      toast.success('Camera started successfully');

      // Capture frames continuously
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }

      frameIntervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const context = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);

          // Convert canvas to image data (for processing if needed)
          const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
          setFrameData(imageData);
        }
      }, 100); // Capture frame every 100ms (10fps)
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Failed to access camera';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera device found.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested resolution.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsCameraActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setError(null);
    setFrameData(null);
    toast.success('Camera stopped');
  }, []);

  // Capture screenshot
  const captureScreenshot = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      // Convert to blob and download
      canvasRef.current.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${new Date().getTime()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Screenshot captured and downloaded');
      }, 'image/jpeg');
    }
  }, []);

  // Handle device change
  const handleDeviceChange = useCallback((deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      stopCamera();
    }
  }, [isCameraActive, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  const value = {
    videoRef,
    streamRef,
    canvasRef,
    isLoading,
    isCameraActive,
    error,
    devices,
    selectedDeviceId,
    frameData,
    startCamera,
    stopCamera,
    captureScreenshot,
    handleDeviceChange,
  };

  return (
    <CameraContext.Provider value={value}>
      {children}
      {/* Hidden video and canvas elements - always present in DOM */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        autoPlay
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </CameraContext.Provider>
  );
};

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};
