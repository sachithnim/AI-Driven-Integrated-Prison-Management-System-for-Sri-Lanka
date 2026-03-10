import createApiClient from "../axiosInstance.js";

// const INMATE_SERVICE_URL = "http://localhost:4005";
// const apiClient = createApiClient(INMATE_SERVICE_URL);

// Empty base URL — /api/prisons/* proxied by Vite → API Gateway → inmate-service
// Set VITE_INMATE_SERVICE_URL in .env to override
const baseURL = import.meta.env.VITE_INMATE_SERVICE_URL || '';

const apiClient = createApiClient(baseURL);

const PrisonService = {
    getAllPrisons: async () => {
        const response = await apiClient.get("/prisons");
        return response.data;
    },

    getActivePrisons: async () => {
        const response = await apiClient.get("/prisons/active");
        return response.data;
    },

    getPrisonById: async (id) => {
        const response = await apiClient.get(`/prisons/${id}`);
        return response.data;
    },

    getAvailablePrisons: async (securityLevel) => {
        const params = securityLevel ? { securityLevel } : {};
        const response = await apiClient.get("/prisons/available", { params });
        return response.data;
    },

    getPrisonsByType: async (type) => {
        const response = await apiClient.get(`/prisons/type/${type}`);
        return response.data;
    },

    getPrisonOccupancy: async (id) => {
        const response = await apiClient.get(`/prisons/${id}/occupancy`);
        return response.data;
    },
};

export default PrisonService;
