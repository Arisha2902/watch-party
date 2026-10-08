import { io, Socket } from "socket.io-client";

const URL = "http://localhost:3001";

function connect(): Promise<Socket> {
  return new Promise((resolve) => {
    const s = io(URL);
    s.on("connect", () => resolve(s));
  });
}

function emitAck(socket: Socket, event: string, payload: unknown): Promise<any> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

async function main() {
  const host = await connect();
  const guest = await connect();
  const stranger = await connect();

  host.on("user_joined", (data) => console.log("   [host received user_joined]", data));

  const created = await emitAck(host, "create_room", { username: "Arisha" });
  console.log("1. create_room:", created);

  console.log("2. host creates again:", await emitAck(host, "create_room", { username: "X" }));

  // guest tries to sneak in role: "host" in the payload. Server must ignore it.
  const joined = await emitAck(guest, "join_room", {
    roomId: created.roomId.toLowerCase(),
    username: "Rahul",
    role: "host",
  });
  console.log("3. join_room (lowercase code, fake role):", joined);

  console.log("4. wrong code:", await emitAck(stranger, "join_room", { roomId: "ZZZZZZ", username: "Aman" }));
  console.log("5. duplicate name:", await emitAck(stranger, "join_room", { roomId: created.roomId, username: "RAHUL" }));
  console.log("6. empty name:", await emitAck(stranger, "join_room", { roomId: created.roomId, username: "  " }));
  console.log("7. null payload:", await emitAck(stranger, "join_room", null));
  stranger.emit("join_room"); // no payload, no ack: server must not crash

  await new Promise((r) => setTimeout(r, 300));
  [host, guest, stranger].forEach((s) => s.disconnect());
}

main();