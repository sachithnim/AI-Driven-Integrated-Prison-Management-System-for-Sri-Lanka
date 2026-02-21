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
    }
};

export default BackendRehabService;
