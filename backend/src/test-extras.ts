import { io, Socket } from "socket.io-client";

const URL = process.env.URL || "http://localhost:3001";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function connect(label: string): Promise<Socket> {
  return new Promise((resolve) => {
    const s = io(URL);
    s.once("connect", () => {
      s.on("chat_message", (m) => console.log(`   [${label} chat] ${m.username} (${m.role}): ${m.text.slice(0, 40)}`));
      s.on("reaction", (r) => console.log(`   [${label} reaction] ${r.username} ${r.type} ${r.emoji}`));
      resolve(s);
    });
  });
}

// resolves with {TIMED_OUT:true} instead of hanging if the server has no handler
const emitAck = (s: Socket, ev: string, p?: unknown): Promise<any> =>
  new Promise((r) => s.timeout(3000).emit(ev, p, (e: any, res: any) => r(e ? { TIMED_OUT: true } : res)));

async function main() {
  const host = await connect("host");
  const rahul = await connect("rahul");
  const outsider = await connect("outsider");

  const created = await emitAck(host, "create_room", { username: "Arisha" });
  const roomId = created.roomId;
  const hostId = created.userId;
  const rahulId = (await emitAck(rahul, "join_room", { roomId, username: "Rahul" })).userId;
  console.log("--- setup: Arisha=host, Rahul=participant ---");

  console.log("--- CHAT ---");
  console.log("1. outsider chat:", await emitAck(outsider, "chat_message", { text: "hi" }));
  console.log("2. participant chat (host AND rahul must both receive it):",
    await emitAck(rahul, "chat_message", { text: "hello everyone", username: "FAKE", role: "host" }));
  await wait(600);
  console.log("3. empty text:", await emitAck(rahul, "chat_message", { text: "   " }));
  console.log("4. 301 characters:", await emitAck(rahul, "chat_message", { text: "x".repeat(301) }));
  console.log("5. non-string text:", await emitAck(rahul, "chat_message", { text: 12345 }));
  console.log("6. html text is just text:", await emitAck(rahul, "chat_message", { text: "<b>bold</b>" }));
  console.log("7. immediately again (rate limit):", await emitAck(rahul, "chat_message", { text: "spam" }));

  console.log("--- REACTIONS ---");
  await wait(300);
  console.log("8. fire (host AND rahul must receive it):", await emitAck(rahul, "reaction", { type: "fire" }));
  await wait(300);
  console.log("9. unknown type:", await emitAck(rahul, "reaction", { type: "hack" }));
  console.log("10. raw emoji instead of a key:", await emitAck(rahul, "reaction", { type: "💀" }));
  console.log("11. prototype key:", await emitAck(rahul, "reaction", { type: "constructor" }));
  console.log("12. outsider reaction:", await emitAck(outsider, "reaction", { type: "like" }));
  await wait(300);
  console.log("13. party, then immediately again (rate limit):",
    (await emitAck(rahul, "reaction", { type: "party" })).ok,
    await emitAck(rahul, "reaction", { type: "party" }));

  console.log("--- THE HOST CANNOT BE CHANGED ---");
  console.log("14. transfer_host no longer exists (TIMED_OUT = no handler):",
    await emitAck(host, "transfer_host", { userId: rahulId }));
  console.log("15. assign_role 'host' is rejected:", await emitAck(host, "assign_role", { userId: rahulId, role: "host" }));
  console.log("16. participant assign_role is rejected:",
    await emitAck(rahul, "assign_role", { userId: hostId, role: "moderator" }));

  console.log("--- ROBUSTNESS ---");
  host.emit("chat_message");          // no payload, no ack
  host.emit("reaction", null);
  await wait(300);
  console.log("17. server still alive:", await emitAck(host, "pause", {}));

  [host, rahul, outsider].forEach((s) => s.disconnect());
}

main();