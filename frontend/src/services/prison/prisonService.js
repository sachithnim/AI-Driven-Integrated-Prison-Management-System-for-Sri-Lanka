import createApiClient from "../axiosInstance";

// const INMATE_SERVICE_URL = "http://localhost:4005";
// const apiClient = createApiClient(INMATE_SERVICE_URL);

const baseURL = import.meta.env.VITE_INMATE_SERVICE_URL;

const apiClient = createApiClient(baseURL);

const PrisonService = {
    getAllPrisons: async () => {
        const response = await apiClient.get("/api/prisons");
        return response.data;
    },

    getActivePrisons: async () => {
        const response = await apiClient.get("/api/prisons/active");
        return response.data;
    },

    getPrisonById: async (id) => {
        const response = await apiClient.get(`/api/prisons/${id}`);
        return response.data;
    },

    getAvailablePrisons: async (securityLevel) => {
        const params = securityLevel ? { securityLevel } : {};
        const response = await apiClient.get("/api/prisons/available", { params });
        return response.data;
    },

    getPrisonsByType: async (type) => {
        const response = await apiClient.get(`/api/prisons/type/${type}`);
        return response.data;
    },

    getPrisonOccupancy: async (id) => {
        const response = await apiClient.get(`/api/prisons/${id}/occupancy`);
        return response.data;
    },
};

export default PrisonService;
