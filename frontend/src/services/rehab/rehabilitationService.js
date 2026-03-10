import createApiClient from "../axiosInstance";

// Proxied through Vite: /ai-api → port 8001 (strip prefix on the way through).
// Set VITE_AI_SERVICE_URL in .env to override.
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || '/ai-api/api/v1';

const apiClient = createApiClient(AI_SERVICE_URL);

const RehabilitationService = {
    checkEligibility: async (inmateData) => {
        const response = await apiClient.post("/predictions/eligibility", inmateData);
        return response.data;
    }
};

export default RehabilitationService;
