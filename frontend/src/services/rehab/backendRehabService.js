import createApiClient from "../axiosInstance";

// Rehabilitation Service URL (Java Backend)
// Assuming it runs on port 4006 based on application.properties
const REHAB_SERVICE_URL = "http://localhost:4006"; 

const apiClient = createApiClient(REHAB_SERVICE_URL);

const BackendRehabService = {
    // Generate recommendation (creates profile if needed)
    createRehabProfile: async (inmateId, inmateData) => {
        const response = await apiClient.post("/rehabilitation/recommend", {
            inmateId,
            inmateData
        });
        return response.data;
    },

    // Get existing profile
    getProfile: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/profile/${inmateId}`);
        return response.data;
    },

    // Get all profiles
    getAllProfiles: async () => {
        const response = await apiClient.get("/rehabilitation/profiles");
        return response.data;
    },

    // Get recommendations
    getRecommendations: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/recommendations/${inmateId}`);
        return response.data;
    },

    // Get medical reports
    getMedicalReports: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/medical-reports/${inmateId}`);
        return response.data;
    },

    // Get counseling notes
    getCounselingNotes: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/counseling-notes/${inmateId}`);
        return response.data;
    },

    // Get progress logs
    getProgressLogs: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/progress-logs/${inmateId}`);
        return response.data;
    },

    // Add medical report
    addMedicalReport: async (payload) => {
        const response = await apiClient.post("/rehabilitation/medical-report", payload);
        return response.data;
    },

    // Add counseling note (basic)
    addCounselingNote: async (payload) => {
        const response = await apiClient.post("/rehabilitation/counseling-note", payload);
        return response.data;
    },

    // Add counseling note WITH AI sentiment analysis
    addCounselingNoteWithAnalysis: async (payload) => {
        const response = await apiClient.post("/rehabilitation/counseling-note/analyze", payload);
        return response.data;
    },

    // Log progress
    logProgress: async (payload) => {
        const response = await apiClient.post("/rehabilitation/progress", payload);
        return response.data;
    },

    // ── Dynamic Eligibility ────────────────────────────────────────────────────

    // Get all available eligibility factors
    getEligibilityFactors: async () => {
        const response = await apiClient.get("/rehabilitation/eligibility/factors");
        return response.data;
    },

    // AI-suggest factor values from raw inmate data (call on inmate select)
    suggestFactorValues: async (inmateData) => {
        const response = await apiClient.post("/rehabilitation/eligibility/suggest-factors", inmateData);
        return response.data;
    },

    // Run dynamic eligibility assessment with selected factors
    assessDynamicEligibility: async (payload) => {
        const response = await apiClient.post("/rehabilitation/eligibility/assess", payload);
        return response.data;
    },

    // ── Post-Rehab Predictions ─────────────────────────────────────────────────

    // Run all post-rehab predictions
    getAllPredictions: async (payload) => {
        const response = await apiClient.post("/rehabilitation/predict/all", payload);
        return response.data;
    },

    // ── Progress Dashboard ─────────────────────────────────────────────────────

    // Get comprehensive progress summary for charts (includes auto-predictions)
    getProgressSummary: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/progress-summary/${inmateId}`);
        return response.data;
    },

    // Get eligibility assessment history
    getEligibilityHistory: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/eligibility-history/${inmateId}`);
        return response.data;
    },

    // ── Auto Predictions (no manual form) ─────────────────────────────────────

    // Auto-generate early release / pardon / home leave predictions from DB data
    getAutoPredictions: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/predictions/auto/${inmateId}`);
        return response.data;
    },

    // ── Batch assessment helper ────────────────────────────────────────────────

    // Get set of inmate IDs that already have a rehab profile (to skip in batch)
    getProfiledIds: async () => {
        const response = await apiClient.get("/rehabilitation/profiled-ids");
        return response.data; // Set<String> serialised as array
    },

    // ── Home Leave Management ──────────────────────────────────────────────────

    requestHomeLeave: async (payload) => {
        const response = await apiClient.post("/rehabilitation/home-leave", payload);
        return response.data;
    },

    getAllHomeLeaves: async () => {
        const response = await apiClient.get("/rehabilitation/home-leave");
        return response.data;
    },

    getActiveHomeLeaves: async () => {
        const response = await apiClient.get("/rehabilitation/home-leave/active");
        return response.data;
    },

    getHomeLeaveById: async (id) => {
        const response = await apiClient.get(`/rehabilitation/home-leave/${id}`);
        return response.data;
    },

    getHomeLeavesByInmate: async (inmateId) => {
        const response = await apiClient.get(`/rehabilitation/home-leave/inmate/${inmateId}`);
        return response.data;
    },

    approveHomeLeave: async (id, officerId, notes) => {
        const params = {};
        if (officerId) params.officerId = officerId;
        if (notes) params.notes = notes;
        const response = await apiClient.put(`/rehabilitation/home-leave/${id}/approve`, null, { params });
        return response.data;
    },

    denyHomeLeave: async (id, officerId, notes) => {
        const params = {};
        if (officerId) params.officerId = officerId;
        if (notes) params.notes = notes;
        const response = await apiClient.put(`/rehabilitation/home-leave/${id}/deny`, null, { params });
        return response.data;
    },

    activateHomeLeave: async (id) => {
        const response = await apiClient.put(`/rehabilitation/home-leave/${id}/activate`);
        return response.data;
    },

    completeHomeLeave: async (id) => {
        const response = await apiClient.put(`/rehabilitation/home-leave/${id}/complete`);
        return response.data;
    },

    revokeHomeLeave: async (id, officerId, notes) => {
        const params = {};
        if (officerId) params.officerId = officerId;
        if (notes) params.notes = notes;
        const response = await apiClient.put(`/rehabilitation/home-leave/${id}/revoke`, null, { params });
        return response.data;
    },

    // ── GPS Tracking ────────────────────────────────────────────────────────────

    updateGPSLocation: async (leaveId, payload) => {
        const response = await apiClient.post(`/rehabilitation/home-leave/${leaveId}/gps`, payload);
        return response.data;
    },

    getGPSHistory: async (leaveId) => {
        const response = await apiClient.get(`/rehabilitation/home-leave/${leaveId}/gps/history`);
        return response.data;
    },
};

export default BackendRehabService;
