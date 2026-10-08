import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export const socket = io(SERVER_URL);

if (import.meta.env.DEV) window.socket = socket;

export function emitAck(event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10000).emit(event, payload, (err, response) => {
      if (err) reject(new Error("Server did not respond. Check your connection."));
      else resolve(response);
    });
  });
}