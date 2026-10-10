import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config";
import { RoomManager } from "./rooms/RoomManager";
import { registerHandlers } from "./socket/handlers";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientOrigins },
});

const rooms = new RoomManager(); // all active rooms live here, in memory

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerHandlers(io, socket, rooms);

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Allowed client origins: ${config.clientOrigins.join(",")}`);
});