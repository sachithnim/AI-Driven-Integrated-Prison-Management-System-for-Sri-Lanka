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

    uploadImage: async (id, file, imageType) => {
        const form = new FormData();
        form.append('file', file);
        form.append('imageType', imageType);

        const response = await apiClient.post(`/inmates/${id}/upload-image`, form, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    extractPhysicalDescription: async (closeFaceImage, fullBodyImage) => {
        const form = new FormData();
        if (closeFaceImage) {
            form.append('closeFaceImage', closeFaceImage);
        }
        if (fullBodyImage) {
            form.append('fullBodyImage', fullBodyImage);
        }

        const response = await apiClient.post('/inmates/extract-physical-description', form, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    updateInmate: async (id, inmateData) => {
        const response = await apiClient.put(`/inmates/${id}`, inmateData);
        return response.data;
    },

    deleteInmate: async (id) => {
        await apiClient.delete(`/inmates/${id}`);
    },

    runAiAssessment: async (id) => {
        const response = await apiClient.post(`/inmates/${id}/run-ai-assessment`);
        return response.data;
    }
};

export default InmateService;
