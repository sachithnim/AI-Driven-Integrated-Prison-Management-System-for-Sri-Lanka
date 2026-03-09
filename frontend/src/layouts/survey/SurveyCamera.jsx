import React, { useEffect, useState, useRef } from "react";
import {
  Camera as CameraIcon,
  Loader,
  AlertCircle,
  Play,
  Square,
  Upload,
  CheckCircle,
  Video,
  Send,
  BarChart3,
  User,
  Mic,
  ChevronRight,
} from "lucide-react";
import { useCamera } from "../../context/CameraContext";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";
import createApiClient from "../../services/axiosInstance";
import toast from "react-hot-toast";

export default function SurveyCamera() {
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

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [nic, setNic] = useState("");
  const [address, setAddress] = useState("");
  const [telNo, setTelNo] = useState("");
  const [crimeDetails, setCrimeDetails] = useState("");

  const localVideoRef = useRef(null);

  // Step 1: Initial Image
  const [initialImage, setInitialImage] = useState(null);
  const [detectedGender, setDetectedGender] = useState("");
  const [detectedEmotion, setDetectedEmotion] = useState("");
  const [genderMismatchWarning, setGenderMismatchWarning] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Step 2: Documents
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isExtractingOCR, setIsExtractingOCR] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Step 3: Questionnaire
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Step 4: Results
  const [currentVoiceEmotion, setCurrentVoiceEmotion] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);
  const axiosInstance = createApiClient();

  useEffect(() => {
    if (step === 3 && questions.length === 0) {
      axiosInstance
        .get("http://127.0.0.1:5010/api/inmate/questions")
        .then((res) => setQuestions(res.data.questions))
        .catch((err) => toast.error("Failed to load questions"));
    }
  }, [step]);

  // Ensure video displays
  useEffect(() => {
    if (localVideoRef.current && streamRef && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [localVideoRef, streamRef, isCameraActive]);

  // Cleanup media recorder on unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleLookup = async (field, value) => {
    if (!value) return;
    try {
      const res = await axiosInstance.get(`http://127.0.0.1:5010/api/inmate/lookup?${field}=${value}`);
      if (res.data.exists && res.data.inmate) {
        const data = res.data.inmate;
        if (field !== "name") setUsername(data.name || "");
        if (field !== "nic") setNic(data.nic || "");
        setAge(data.age || "");
        setAddress(data.address || "");
        setTelNo(data.tel_no || "");
        setCrimeDetails(data.crime_details || "");
        setGender(data.gender || "Male");
        toast.success(`Found existing inmate: ${data.name}. Fields auto-filled.`);
      }
    } catch (err) {
      console.error("Lookup failed:", err);
    }
  };

  const handleRegisterAndCapture = async () => {
    if (!username || !age) {
      toast.error("Please enter username and age.");
      return;
    }

    // 1. Register or Update
    try {
      await axiosInstance.post("http://127.0.0.1:5010/api/inmate/register", {
        name: username,
        age: parseInt(age),
        gender,
        nic,
        address,
        tel_no: telNo,
        crime_details: crimeDetails
      });
      toast.success("Inmate record saved.");
    } catch (error) {
      if (error.response && error.response.status !== 400) {
        toast.error("Failed to save inmate record.");
        return;
      }
    }

    // 2. Capture and Analyze
    const canvas = document.createElement("canvas");
    const videoElem = localVideoRef.current || videoRef.current;
    if (!videoElem) {
      toast.error("Camera not active");
      return;
    }
    canvas.width = videoElem.videoWidth;
    canvas.height = videoElem.videoHeight;
    canvas.getContext("2d").drawImage(videoElem, 0, 0);

    canvas.toBlob(async (blob) => {
      setInitialImage(URL.createObjectURL(blob));
      setIsAnalyzingImage(true);

      const formData = new FormData();
      formData.append("Username", username);
      formData.append("image", blob, "initial.jpg");

      try {
        const res = await axiosInstance.post(
          "http://127.0.0.1:5010/api/inmate/analyze_initial_image",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        setDetectedGender(res.data.gender);
        setDetectedEmotion(res.data.emotion);
        if (res.data.mismatch_warning) {
          setGenderMismatchWarning(res.data.mismatch_warning);
          toast.error(res.data.mismatch_warning, { duration: 5000 });
        } else {
          setGenderMismatchWarning(null);
        }
        toast.success("Image analyzed successfully!");
      } catch (err) {
        toast.error("Failed to analyze image.");
      } finally {
        setIsAnalyzingImage(false);
      }
    }, "image/jpeg");
  };

  const handlePrescriptionUpload = async () => {
    if (!prescriptionFile) return toast.error("Select prescription image");
    setIsExtractingOCR(true);
    const formData = new FormData();
    formData.append("Username", username);
    formData.append("image", prescriptionFile);
    try {
      const res = await axiosInstance.post(
        "http://127.0.0.1:5010/api/inmate/extract_prescription",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setExtractedOcrText(res.data.extracted_text);
      toast.success("Prescription OCR extracted!");
    } catch (error) {
      toast.error("Failed to extract prescription.");
    } finally {
      setIsExtractingOCR(false);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return toast.error("Select PDF file");
    setIsUploadingPdf(true);
    const formData = new FormData();
    formData.append("file", pdfFile);
    try {
      await axiosInstance.post(
        "http://127.0.0.1:5010/api/admin/upload_medical_record",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success("PDF record uploaded!");
    } catch (error) {
      toast.error("Failed to upload PDF.");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const startAudioRecording = () => {
    if (isRecordingAnswer) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          setIsRecordingAnswer(false);
          toast.success("Audio captured.");
        };

        mediaRecorder.start();
        setIsRecordingAnswer(true);
      })
      .catch((err) => toast.error("Microphone access denied."));
  };

  const stopAudioRecording = () => {
    return new Promise((resolve) => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          setIsRecordingAnswer(false);
          toast.success("Audio captured.");
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(audioBlob);
      }
    });
  };

  useEffect(() => {
    if (
      step === 3 &&
      questions.length > 0 &&
      !currentVoiceEmotion &&
      !isProcessingAnswer
    ) {
      if (
        !isRecordingAnswer &&
        (!mediaRecorderRef.current ||
          mediaRecorderRef.current.state === "inactive")
      ) {
        startAudioRecording();
      }
    }
  }, [
    step,
    questions,
    currentQuestionIndex,
    currentVoiceEmotion,
    isProcessingAnswer,
    isRecordingAnswer,
  ]);

  const analyzeAnswer = async () => {
    if (!currentAnswerText) {
      toast.error("Please provide a typed/selected answer.");
      return;
    }

    setIsProcessingAnswer(true);

    let finalBlob = audioBlob;
    if (isRecordingAnswer) {
      finalBlob = await stopAudioRecording();
    }

    const formData = new FormData();
    formData.append("Username", username);
    formData.append("question", questions[currentQuestionIndex]);
    formData.append("answer", currentAnswerText);
    if (finalBlob) {
      formData.append("audio", finalBlob, "answer.webm");
    }

    try {
      const res = await axiosInstance.post(
        "http://127.0.0.1:5010/api/inmate/analyze_voice",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success(`Voice Emotion Detected: ${res.data.voice_emotion}`);
      setCurrentVoiceEmotion(res.data.voice_emotion);
    } catch (err) {
      toast.error("Failed to process answer.");
    } finally {
      setIsProcessingAnswer(false);
    }
  };

  const proceedToNextQuestion = () => {
    setCurrentAnswerText("");
    setAudioBlob(null);
    setCurrentVoiceEmotion(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep(4);
      generateFinalResults();
    }
  };

  const generateFinalResults = async () => {
    setIsGeneratingResults(true);
    try {
      const response = await axiosInstance.post(
        "http://127.0.0.1:5010/api/admin/analyze_inmate",
        { Username: username },
      );
      setAnalysisData(response.data);
      toast.success("Final Analysis completed!");
    } catch (error) {
      toast.error("Failed to generate final report.");
    } finally {
      setIsGeneratingResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Setup */}
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <CameraIcon className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            Diagnostic Pipeline
          </h1>

          {/* Survey Guidelines */}
          <div className="mt-6 bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mt-1">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Assessment Guidelines</h3>
              <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 font-medium">
                <li><span className="text-slate-700">Register inmate</span></li>
                <li><span className="text-slate-700">Take a photo and analyze</span></li>
                <li><span className="text-slate-700">Upload prescriptions if have</span></li>
                <li><span className="text-slate-700">Upload medical reports if have</span></li>
                <li><span className="text-slate-700">Speak in English while picking an answer and speaking the answer at the same time</span></li>
                <li><span className="text-slate-700">Analyze to get the report</span></li>
              </ol>
            </div>
          </div>

          {/* Stepper Progress Map */}
          <div className="flex items-center justify-between mt-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>

            {[1, 2, 3, 4].map((num, i) => (
              <div
                key={num}
                className="flex flex-col items-center gap-2 bg-white px-2"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= num ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-200 text-slate-500"}`}
                >
                  {step > num ? <CheckCircle className="w-5 h-5" /> : num}
                </div>
                <span
                  className={`text-xs font-semibold ${step >= num ? "text-slate-800" : "text-slate-400"}`}
                >
                  {num === 1
                    ? "Identity"
                    : num === 2
                      ? "Documents"
                      : num === 3
                        ? "Q&A"
                        : "Results"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: IDENTITY & IMAGE */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 tracking-wide text-slate-800">
                <User className="text-blue-600 w-6 h-6" /> Subject Registration
              </h2>
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={(e) => handleLookup("name", e.target.value)}
                placeholder="e.g. JohnDoe"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 30"
                />
                <Input
                  label="NIC Number"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  onBlur={(e) => handleLookup("nic", e.target.value)}
                  placeholder="e.g. 123456789V"
                />
              </div>
              <Input
                label="Home Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  value={telNo}
                  onChange={(e) => setTelNo(e.target.value)}
                  placeholder="e.g. +1 555-0100"
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Crime Details
                </label>
                <textarea
                  value={crimeDetails}
                  onChange={(e) => setCrimeDetails(e.target.value)}
                  placeholder="Brief description of the incarcerated offense..."
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleRegisterAndCapture}
                  disabled={!isCameraActive || isAnalyzingImage}
                  loading={isAnalyzingImage}
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Take Initial Photo & Analyze
                </Button>
                <p className="text-xs text-slate-500 text-center mt-3">
                  This will extract visual emotion and automated gender
                  classification
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="relative bg-black rounded-lg aspect-video flex items-center justify-center overflow-hidden mb-4">
                {!isCameraActive && (
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-black"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start Camera
                  </Button>
                )}
                <video
                  ref={localVideoRef}
                  className={`w-full h-full object-cover ${!isCameraActive ? "hidden" : ""}`}
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              {initialImage && (
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-lg">
                    <img
                      src={initialImage}
                      alt="Captured"
                      className="w-16 h-16 rounded-md object-cover shadow"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Analyzed Identity
                      </p>
                      <p className="text-xs text-slate-600">
                        Model Gender:{" "}
                        <span className="font-semibold text-blue-700">
                          {detectedGender}
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">
                        Visual Emotion:{" "}
                        <span className="font-semibold text-blue-700">
                          {detectedEmotion}
                        </span>
                      </p>
                      {genderMismatchWarning && (
                        <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded-md border border-red-200 flex items-start gap-1">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{genderMismatchWarning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setStep(2)}
                    className="bg-slate-900 text-white hover:bg-slate-800 self-end"
                  >
                    Proceed to Medical Documents{" "}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: DOCTOR DOCUMENTS */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800">
              Upload Medical Documents
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Prescription Section */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700 mb-1">
                    Prescription Image
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Upload a clear photo for OCR extraction
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPrescriptionFile(e.target.files[0])}
                    className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <Button
                  onClick={handlePrescriptionUpload}
                  loading={isExtractingOCR}
                  disabled={!prescriptionFile}
                  className="w-full"
                >
                  Extract with GLM-OCR
                </Button>
                {extractedOcrText && (
                  <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-700 max-h-32 overflow-y-auto font-mono">
                    {extractedOcrText}
                  </div>
                )}
              </div>

              {/* PDF Reports Section */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700 mb-1">
                    Past Medical Reports
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Upload PDF files for vector search context
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handlePdfUpload}
                  loading={isUploadingPdf}
                  disabled={!pdfFile}
                  className="w-full"
                >
                  Upload to ChromaDB
                </Button>
              </div>
            </div>

            <div className="mt-8 flex justify-end pt-4 border-t border-slate-100">
              <Button
                onClick={() => setStep(3)}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Proceed to Questionnaire{" "}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: QUESTIONNAIRE */}
        {step === 3 && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                Psychological Assessment
              </h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
              <p className="text-xl font-medium text-slate-800 leading-relaxed">
                {questions[currentQuestionIndex]}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Audio Recording */}
              <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-red-500" /> Verbal Answer
                </h3>
                <p className="text-xs text-slate-500">
                  Record the prisoner's spoken answer for Quantized Word2Vec
                  emotion detection.
                </p>

                <div className="flex gap-3">
                  {isRecordingAnswer ? (
                    <div className="flex-1 py-3 bg-red-50 text-red-600 font-semibold rounded-lg border border-red-200 flex items-center justify-center gap-2 animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>{" "}
                      Recording Answer...
                    </div>
                  ) : audioBlob ? (
                    <div className="flex-1 py-3 bg-slate-50 text-slate-500 font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Audio
                      Recorded
                    </div>
                  ) : (
                    <div className="flex-1 py-3 bg-slate-50 text-slate-500 font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-2">
                      Preparing Microphone...
                    </div>
                  )}
                </div>
              </div>

              {/* Text Answer */}
              <div className="space-y-4">
                <Input
                  label="Typed / Picked Answer"
                  placeholder="Type the answer here..."
                  value={currentAnswerText}
                  onChange={(e) => setCurrentAnswerText(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => setCurrentAnswerText("Not at all")}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  >
                    Not at all
                  </button>
                  <button
                    onClick={() => setCurrentAnswerText("Several days")}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  >
                    Several days
                  </button>
                  <button
                    onClick={() =>
                      setCurrentAnswerText("More than half the days")
                    }
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  >
                    More than half
                  </button>
                  <button
                    onClick={() => setCurrentAnswerText("Nearly every day")}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  >
                    Nearly every day
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end items-center gap-6">
              {!currentVoiceEmotion ? (
                <Button
                  size="lg"
                  variant="primary"
                  onClick={analyzeAnswer}
                  loading={isProcessingAnswer}
                  disabled={!currentAnswerText || isProcessingAnswer}
                >
                  Analyze Answer
                </Button>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 mr-auto">
                    Detected Voice Emotion:{" "}
                    <span className="text-lg">{currentVoiceEmotion}</span>
                  </div>
                  <Button
                    size="lg"
                    onClick={proceedToNextQuestion}
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {currentQuestionIndex < questions.length - 1
                      ? "Next Question"
                      : "Complete Assessment"}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: RECOMMENDATIONS */}
        {step === 4 && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            {isGeneratingResults || !analysisData ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                <h2 className="text-xl font-bold text-slate-800">
                  Aggregating AI Data...
                </h2>
                <p className="text-slate-500 text-center max-w-md">
                  Running LLM over extracted OCR, PDF contexts, visual emotions,
                  gender demographics, and Word2Vec voice profiles.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">
                      Final Diagnostic Report
                    </h2>
                    <p className="text-slate-500">
                      Generated for {username} ({age} yrs, {detectedGender})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-4">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-500 tracking-wider uppercase mb-1">
                        Risk Level
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-2xl font-black ${
                            analysisData.analysis.risk_level === "High"
                              ? "text-red-600"
                              : analysisData.analysis.risk_level === "Medium"
                                ? "text-orange-500"
                                : "text-emerald-500"
                          }`}
                        >
                          {analysisData.analysis.risk_level}
                        </span>
                        {analysisData.analysis.urgent_alert && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                         <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Tracking Progress</p>
                         <div className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {analysisData.analysis.progress_indicator || "Initial"}
                         </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-500 tracking-wider uppercase mb-3">
                        Suspected Conditions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysisData.analysis.suspected_conditions?.map(
                          (c, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm"
                            >
                              {c}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>{" "}
                        AI Reasoning
                      </h3>
                      <p className="text-slate-600 leading-relaxed bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                        {analysisData.analysis.reasoning}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>{" "}
                        Recommended Actions
                      </h3>
                      <ul className="space-y-3">
                        {analysisData.analysis.recommended_actions?.map(
                          (action, i) => (
                            <li
                              key={i}
                              className="flex gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm"
                            >
                              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 font-bold text-xs rounded-full flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="text-slate-700">{action}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    {analysisData.history && analysisData.history.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>{" "}
                          Historical Progress
                        </h3>
                        <div className="space-y-3">
                          {analysisData.history.map((log, i) => (
                             <div key={i} className="flex flex-col gap-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center">
                                   <span className="text-sm font-bold text-slate-700">{log.date}</span>
                                   <span className="text-xs font-semibold px-2 py-1 bg-slate-200 rounded text-slate-600">{log.progress_indicator}</span>
                                </div>
                                <p className="text-sm text-slate-600">Risk Level: <strong className={log.risk_level === "High" ? "text-red-600" : log.risk_level === "Medium" ? "text-orange-500" : "text-emerald-500"}>{log.risk_level}</strong></p>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200 flex justify-end">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    Start New Assessment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
