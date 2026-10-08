import { io, Socket } from "socket.io-client";

const URL = "http://localhost:3001";
const EVENTS = ["user_joined", "user_left", "role_assigned", "participant_removed", "removed_from_room"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Print participants as "Name:role" so the output stays readable
function show(data: any) {
  if (!data?.participants) return data;
  return { ...data, participants: data.participants.map((p: any) => `${p.username}:${p.role}`).join(", ") };
}

function connect(label: string): Promise<Socket> {
  return new Promise((resolve) => {
    const s = io(URL);
    s.once("connect", () => {
      for (const ev of EVENTS) s.on(ev, (d) => console.log(`   [${label} got ${ev}]`, show(d)));
      resolve(s);
    });
  });
}

function emitAck(socket: Socket, event: string, payload: unknown): Promise<any> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

async function main() {
  const host = await connect("host");
  const rahul = await connect("rahul");
  const aman = await connect("aman");

  const created = await emitAck(host, "create_room", { username: "Arisha" });
  const roomId = created.roomId;
  const rahulId = (await emitAck(rahul, "join_room", { roomId, username: "Rahul" })).userId;
  const amanId = (await emitAck(aman, "join_room", { roomId, username: "Aman" })).userId;
  const hostId = created.userId;
  await wait(200);
  console.log("--- setup done: Arisha=host, Rahul + Aman=participants ---");

  console.log("1. participant assigns role:", await emitAck(rahul, "assign_role", { userId: amanId, role: "moderator" }));
  console.log("2. participant removes host:", await emitAck(rahul, "remove_participant", { userId: hostId }));
  console.log("3. host promotes Rahul:", await emitAck(host, "assign_role", { userId: rahulId, role: "moderator" }));
  await wait(200);
  console.log("4. assign role 'host':", await emitAck(host, "assign_role", { userId: amanId, role: "host" }));
  console.log("5. host changes own role:", await emitAck(host, "assign_role", { userId: hostId, role: "participant" }));
  console.log("6. host removes self:", await emitAck(host, "remove_participant", { userId: hostId }));
  console.log("7. unknown userId:", await emitAck(host, "assign_role", { userId: "nope", role: "moderator" }));
  console.log("8. moderator assigns role:", await emitAck(rahul, "assign_role", { userId: amanId, role: "moderator" }));
  console.log("9. host removes Aman:", await emitAck(host, "remove_participant", { userId: amanId }));
  await wait(200);
  console.log("10. removed user acts:", await emitAck(aman, "assign_role", { userId: rahulId, role: "participant" }));
  console.log("11. Rahul leave_room:", await emitAck(rahul, "leave_room", {}));
  await wait(200);

  console.log("12. Zed joins, then disconnects abruptly");
  const zed = await connect("zed");
  await emitAck(zed, "join_room", { roomId, username: "Zed" });
  await wait(100);
  zed.disconnect();
  await wait(300);

  const late = await connect("late");
  const lateJoin = await emitAck(late, "join_room", { roomId, username: "Late" });
  console.log("13. late joiner sees:", lateJoin.participants.map((p: any) => `${p.username}:${p.role}`).join(", "));

  console.log("14a. assign_role null payload:", await emitAck(host, "assign_role", null));
  host.emit("remove_participant"); // no payload, no ack: server must not crash
  await wait(300);

  [host, rahul, aman, late].forEach((s) => s.disconnect());
}

main();