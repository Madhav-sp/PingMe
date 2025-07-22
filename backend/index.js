import express from "express";
import userRouter from "./routes/user.route.js";
import dotenv from "dotenv";
import cors from "cors";
import { connectdb } from "./config/db.js";
import messagerouter from "./routes/message.route.js";
import http from "http";
import { Server } from "socket.io";
import Message from "./models/message.model.js";

const app = express();
dotenv.config();
await connectdb();

app.use(express.json());
app.use(
  cors({
    origin: "https://pingme-gwv5.onrender.com",
    credentials: true,
  })
);

app.use("/api/v1", userRouter);
app.use("/api/v1", messagerouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://pingme-gwv5.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("sendMessage", async (data) => {
    const { sender, receiver, text, time } = data;

    try {
      const message = await Message.create({ sender, receiver, text, time });

      // ✅ FIX: Send the same message data to both users
      const messageData = {
        ...message._doc,
      };

      // Send to receiver's room
      io.to(receiver).emit("receiveMessage", messageData);

      // Send to sender's room (so they see their own message)
      io.to(sender).emit("receiveMessage", messageData);

      console.log(`Message sent from ${sender} to ${receiver}`);
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally emit error back to sender
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
