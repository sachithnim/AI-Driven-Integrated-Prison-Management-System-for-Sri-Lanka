import createApiClient from "../axiosInstance.js";

const baseURL = import.meta.env.VITE_INMATE_SERVICE_URL;

const apiClient = createApiClient(baseURL);

const CellService = {
    getAllCells: async () => {
        const response = await apiClient.get("/cells");
        return response.data;
    },

    getCellById: async (id) => {
        const response = await apiClient.get(`/cells/${id}`);
        return response.data;
    },

    createCell: async (cellData) => {
        const response = await apiClient.post("/cells", cellData);
        return response.data;
    },

    updateCell: async (id, cellData) => {
        const response = await apiClient.put(`/cells/${id}`, cellData);
        return response.data;
    },

    deleteCell: async (id) => {
        await apiClient.delete(`/cells/${id}`);
    }
};

export default CellService;
