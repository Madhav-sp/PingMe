// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://pingme-backend-vl8g.onrender.com", {
  withCredentials: true,
});

export default socket;

