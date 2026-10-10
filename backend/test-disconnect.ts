import { io, Socket } from "socket.io-client";

const URL = "http://localhost:3001";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const names = (d: any) => d.participants.map((p: any) => `${p.username}:${p.role}`).join(", ");

function connect(label: string): Promise<Socket> {
  return new Promise((resolve) => {
    const s = io(URL);
    s.once("connect", () => {
      s.on("user_left", (d) => console.log(`   [${label} user_left]`, names(d)));
      s.on("role_assigned", (d) =>
        console.log(`   [${label} role_assigned]`, d.username, "->", d.role, "|", names(d)));
      resolve(s);
    });
  });
}
const emitAck = (s: Socket, ev: string, p?: unknown): Promise<any> =>
  new Promise((r) => s.timeout(3000).emit(ev, p, (e: any, res: any) => r(e ? { TIMED_OUT: true } : res)));

async function main() {
  const host = await connect("host");
  const a = await connect("Anna");
  const b = await connect("Ben");
  const c = await connect("Cleo");

  const { roomId } = await emitAck(host, "create_room", { username: "Host" });
  const aId = (await emitAck(a, "join_room", { roomId, username: "Anna" })).userId;
  await wait(50);
  await emitAck(b, "join_room", { roomId, username: "Ben" });
  await wait(50);
  const cId = (await emitAck(c, "join_room", { roomId, username: "Cleo" })).userId;
  await emitAck(host, "assign_role", { userId: aId, role: "moderator" });
  await wait(200);

  console.log("--- 1. host disconnects: Anna (oldest moderator) becomes host ---");
  host.disconnect();
  await wait(300);

  console.log("--- 2. Cleo (participant) tries assign_role: must be rejected ---");
  console.log("  ", await emitAck(c, "assign_role", { userId: aId, role: "participant" }));
  console.log("--- 2b. Anna (new host) promotes Cleo: must work ---");
  console.log("  ", await emitAck(a, "assign_role", { userId: cId, role: "moderator" }));
  await wait(200);

  console.log("--- 3. Anna leaves: Cleo (moderator) beats Ben (participant) ---");
  a.disconnect();
  await wait(300);

  console.log("--- 4. everyone leaves: room deleted ---");
  b.disconnect();
  await wait(100);
  c.disconnect();
  await wait(300);
  const late = await connect("late");
  console.log("   join deleted room:", await emitAck(late, "join_room", { roomId, username: "Zoe" }));
  late.disconnect();
}
main();