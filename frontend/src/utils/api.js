import axios from "axios";
const BASE_URL = window.location.origin.includes("localhost")
  ? "http://127.0.0.1:8000"
  : window.location.origin.includes("5.223.87.80")
  ? "http://5.223.87.80"
  : "https://wedmangal.com";


const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

// Function to check if the token is expired
const isTokenExpired = () => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (!userInfo || !userInfo.token) return true;

  try {
    const tokenParts = JSON.parse(atob(userInfo.token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return tokenParts.exp < now; // Returns true if expired
  } catch (error) {
    return true; // Treat as expired if decoding fails
  }
};

// Function to refresh the token
const refreshAccessToken = async () => {
  let userInfo = JSON.parse(localStorage.getItem("userInfo"));

  if (!userInfo || !userInfo.refresh) {  // ✅ Fixed condition
    console.error("No refresh token. Logging out...");
    localStorage.removeItem("userInfo");
    window.location.href = "/login"; 
    return null;
  }

  try {
    console.log("Refreshing access token...");
    const response = await axios.post(`${BASE_URL}/api/token/refresh/`, {
      refresh: userInfo.refresh,
    });

    userInfo.token = response.data.access;
    localStorage.setItem("userInfo", JSON.stringify(userInfo));

    console.log("Token refreshed successfully!");
    return response.data.access;
  } catch (error) {
    console.error("Token refresh failed. Logging out...");
    localStorage.removeItem("userInfo");
    window.location.href = "/login"; 
    return null;
  }
};

// Axios request interceptor: Handles expired tokens + CSRF
api.interceptors.request.use(
  async (config) => {
    let userInfo = JSON.parse(localStorage.getItem("userInfo"));

    if (isTokenExpired()) {
      if (userInfo?.refresh) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          userInfo = JSON.parse(localStorage.getItem("userInfo"));
          config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
      } else if (userInfo) {
        localStorage.removeItem("userInfo");
        window.location.href = "/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      }
    } else if (userInfo?.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
    }

    // Attach Django CSRF token for mutating requests
    const csrfToken = getCsrfToken();
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Export API instance
export default api;
