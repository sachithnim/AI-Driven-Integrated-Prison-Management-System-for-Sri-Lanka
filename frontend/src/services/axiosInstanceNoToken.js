import axios from "axios";

// Empty base URL by default — /auth/* is proxied by Vite → http://localhost:4004
// Set VITE_BASE_URL in .env to override in production
const getBaseURL = () => {
  if (window.ENV && window.ENV.VITE_BASE_URL && window.ENV.VITE_BASE_URL !== '__VITE_BASE_URL__') {
    return window.ENV.VITE_BASE_URL;
  }
  return import.meta.env.VITE_BASE_URL || '';
};

const axiosInstanceNoToken = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstanceNoToken;
