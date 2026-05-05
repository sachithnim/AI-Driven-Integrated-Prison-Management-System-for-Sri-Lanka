import createApiClient from "../axiosInstance.js";

// Same baseURL as inmateService since staff is hosted on inmate-service
const baseURL = import.meta.env.VITE_INMATE_SERVICE_URL || '';

const apiClient = createApiClient(baseURL);

const StaffService = {
    getAllStaff: async () => {
        const response = await apiClient.get("/staff");
        return response.data;
    },

    getStaffByRole: async (role) => {
        const response = await apiClient.get(`/staff/role/${role}`);
        return response.data;
    },

    createStaff: async (staffData) => {
        const response = await apiClient.post("/staff", staffData);
        return response.data;
    },

    deleteStaff: async (id) => {
        await apiClient.delete(`/staff/${id}`);
    }
};

export default StaffService;
