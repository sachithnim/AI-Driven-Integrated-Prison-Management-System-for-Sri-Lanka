import axios from "axios";

// Use runtime config if available, fallback to build-time env var
const getBaseURL = () => {
  if (window.ENV && window.ENV.VITE_BASE_URL && window.ENV.VITE_BASE_URL !== '__VITE_BASE_URL__') {
    return window.ENV.VITE_BASE_URL;
  }
  return import.meta.env.VITE_BASE_URL;
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

axiosInstance.interceptors.response.use((response) => {
    return response;
    }, (error) => {
    if (error.response && error.response.status === 401) {
        console.error("Unauthorized! Redirecting to login...");
        localStorage.removeItem("token");
        window.location.href = "/sign-in";
    }
    return Promise.reject(error);
}
);


export default axiosInstance;
