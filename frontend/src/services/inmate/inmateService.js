import createApiClient from "../axiosInstance.js";

// Empty base URL — /inmates/* proxied by Vite → http://localhost:4007
// Set VITE_INMATE_SERVICE_URL in .env to override (e.g. in production)
const baseURL = import.meta.env.VITE_INMATE_SERVICE_URL || '';


const apiClient = createApiClient(baseURL);

const InmateService = {
    getAllInmates: async () => {
        const response = await apiClient.get("/inmates");
        return response.data;
    },

    getInmateById: async (id) => {
        const response = await apiClient.get(`/inmates/${id}`);
        return response.data;
    },

    createInmate: async (inmateData) => {
        const response = await apiClient.post("/inmates", inmateData);
        return response.data;
    },

    updateInmate: async (id, inmateData) => {
        const response = await apiClient.put(`/inmates/${id}`, inmateData);
        return response.data;
    },

    deleteInmate: async (id) => {
        await apiClient.delete(`/inmates/${id}`);
    }
};

export default InmateService;
