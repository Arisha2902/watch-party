import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("Connected with id:", socket.id);
  socket.emit("hello", "Firoz", (reply: string) => {
    console.log("Server replied:", reply);
    socket.disconnect();
  });
});

socket.on("connect_error", (err) => console.log("Connect error:", err.message));