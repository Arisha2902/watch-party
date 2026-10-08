import { io, Socket } from "socket.io-client";

const URL = "http://localhost:3001";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round = (n: number) => Math.round(n * 10) / 10;

function connect(label: string): Promise<Socket> {
  return new Promise((resolve) => {
    const s = io(URL);
    s.once("connect", () => {
      s.on("sync_state", (d) =>
        console.log(`   [${label} got sync_state]`, { ...d, currentTime: round(d.currentTime) })
      );
      resolve(s);
    });
  });
}

function emitAck(socket: Socket, event: string, payload?: unknown): Promise<any> {
  return new Promise((resolve) =>
    socket.timeout(3000).emit(event, payload, (err: Error | null, res: any) =>
      resolve(err ? { TIMED_OUT: "no ack, so the server has no handler for this event" } : res)
    )
  );
}

async function main() {
  const host = await connect("host");
  const rahul = await connect("rahul");
  const aman = await connect("aman");
  const outsider = await connect("outsider");

  const created = await emitAck(host, "create_room", { username: "Arisha" });
  const roomId = created.roomId;
  await emitAck(rahul, "join_room", { roomId, username: "Rahul" });
  const amanJoin = await emitAck(aman, "join_room", { roomId, username: "Aman" });
  console.log("--- setup: Arisha=host, Rahul + Aman=participants ---");

  console.log("--- ATTACKS by a participant (raw socket.emit, no UI) ---");
  console.log("1. participant play:", await emitAck(rahul, "play", {}));
  console.log("2. participant pause:", await emitAck(rahul, "pause", {}));
  console.log("3. participant seek:", await emitAck(rahul, "seek", { time: 100 }));
  console.log("4. participant change_video (fake role in payload):",
    await emitAck(rahul, "change_video", { videoId: "dQw4w9WgXcQ", role: "host" }));
  console.log("5. outsider (not in any room) play:", await emitAck(outsider, "play", {}));
  await wait(200);

  console.log("--- HOST: validation ---");
  console.log("6. play with no video:", await emitAck(host, "play", {}));
  console.log("7a. change_video 'abc':", await emitAck(host, "change_video", { videoId: "abc" }));
  console.log("7b. change_video number:", await emitAck(host, "change_video", { videoId: 12345678901 }));
  console.log("7c. change_video script:", await emitAck(host, "change_video", { videoId: "<script>a</script>" }));

  console.log("--- HOST: real actions (all 3 members must get sync_state) ---");
  console.log("8. host change_video:", await emitAck(host, "change_video", { videoId: "dQw4w9WgXcQ" }));
  await wait(200);
  console.log("9. host play:", await emitAck(host, "play", {}));
  await wait(1000);

  console.log("10. late joiner while PLAYING, state in ack:");
  const late = await connect("late");
  const lateJoin = await emitAck(late, "join_room", { roomId, username: "Late" });
  console.log("   ", { ...lateJoin.state, currentTime: round(lateJoin.state.currentTime) });
  late.disconnect();

  console.log("11. host seek 330:", await emitAck(host, "seek", { time: 330 }));
  await wait(200);
  console.log("12a. seek -5:", await emitAck(host, "seek", { time: -5 }));
  console.log("12b. seek '10' (string):", await emitAck(host, "seek", { time: "10" }));
  console.log("12c. seek null:", await emitAck(host, "seek", { time: null }));
  console.log("12d. seek huge:", await emitAck(host, "seek", { time: 999999999 }));

  await wait(1000);
  console.log("13. host pause:", await emitAck(host, "pause", {}));
  await wait(1500);
  const late2 = await connect("late2");
  const late2Join = await emitAck(late2, "join_room", { roomId, username: "Late2" });
  console.log("    late joiner 1.5s after pause, state in ack:",
    { ...late2Join.state, currentTime: round(late2Join.state.currentTime) });
  late2.disconnect();

  console.log("--- MODERATOR ---");
  const amanId = amanJoin.userId;
  console.log("14. host promotes Aman:", await emitAck(host, "assign_role", { userId: amanId, role: "moderator" }));
  console.log("15a. moderator seek 50:", await emitAck(aman, "seek", { time: 50 }));
  console.log("15b. moderator assign_role:", await emitAck(aman, "assign_role", { userId: amanId, role: "participant" }));
  await wait(200);

  console.log("--- ROBUSTNESS ---");
  host.emit("play");        // no payload, no ack
  host.emit("seek");        // no payload, no ack
  rahul.emit("change_video", null);
  await wait(300);
  console.log("16. server still alive:", await emitAck(host, "pause", {}));

  [host, rahul, aman, outsider].forEach((s) => s.disconnect());
}

main();