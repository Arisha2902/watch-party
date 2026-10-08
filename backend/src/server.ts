import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientOrigin },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Temporary event, only to test a round trip. We'll delete it later.
  socket.on("hello", (name: string, ack: (reply: string) => void) => {
    ack(`Hello ${name}, your socket id is ${socket.id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Allowed client origin: ${config.clientOrigin}`);
});