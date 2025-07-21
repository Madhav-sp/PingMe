

import axios from "axios";

export const axiosinstance = axios.create({
  baseURL: "https://pingme-backend-vl8g.onrender.com/api/v1", 
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, 
});

export default axiosinstance;
