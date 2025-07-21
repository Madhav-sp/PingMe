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

    const message = await Message.create({ sender, receiver, text, time });

    io.to(receiver).emit("receiveMessage", {
      ...message._doc,
      senderName: "Other",
    });

    io.to(sender).emit("receiveMessage", {
      ...message._doc,
      senderName: "You",
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
