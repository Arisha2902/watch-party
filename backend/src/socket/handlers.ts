import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { Room } from "../rooms/Room";
import { Participant } from "../types";
import { normalizeRoomCode } from "../utils/roomCode";

const MAX_USERNAME_LENGTH = 20;
const USERNAME_ERROR = `Username must be 1-${MAX_USERNAME_LENGTH} characters.`;

// ---------- helpers for untrusted input ----------

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function parseUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= MAX_USERNAME_LENGTH ? name : null;
}

// A client may send no ack callback at all. Calling undefined() would crash the server.
function toReply(ack: unknown): (response: object) => void {
  return typeof ack === "function" ? (ack as (r: object) => void) : () => {};
}

// ---------- shared by create and join ----------

function enterRoom(socket: Socket, roomId: string): void {
  socket.join(roomId);          // Socket.IO room: lets us broadcast with io.to(roomId)
  socket.data.roomId = roomId;  // our own record of "which room is this socket in"
}

function buildJoinResponse(room: Room, me: Participant) {
  return {
    ok: true,
    roomId: room.roomId,
    userId: me.userId,
    role: me.role,
    participants: room.listParticipants(),
    state: room.getState(), // initial sync for the new user
  };
}

// ---------- event handlers ----------

export function registerHandlers(io: Server, socket: Socket, rooms: RoomManager): void {
  socket.on("create_room", (payload: unknown, ack: unknown) => {
    const reply = toReply(ack);

    if (socket.data.roomId) {
      return reply({ ok: false, error: "You are already in a room." });
    }
    const username = parseUsername(asObject(payload).username);
    if (!username) return reply({ ok: false, error: USERNAME_ERROR });

    const room = rooms.createRoom();
    const me: Participant = {
      userId: socket.id,
      username,
      role: "host", // decided by the server, never by the client
      joinedAt: Date.now(),
    };
    room.addParticipant(me);
    enterRoom(socket, room.roomId);

    reply(buildJoinResponse(room, me));
  });

  socket.on("join_room", (payload: unknown, ack: unknown) => {
    const reply = toReply(ack);

    if (socket.data.roomId) {
      return reply({ ok: false, error: "You are already in a room." });
    }
    const body = asObject(payload);

    const username = parseUsername(body.username);
    if (!username) return reply({ ok: false, error: USERNAME_ERROR });

    const roomId = normalizeRoomCode(body.roomId);
    if (!roomId) return reply({ ok: false, error: "Enter a valid 6-character room code." });

    const room = rooms.getRoom(roomId);
    if (!room) return reply({ ok: false, error: "Room not found. Check the code." });

    if (room.isUsernameTaken(username)) {
      return reply({ ok: false, error: "That username is already taken in this room." });
    }

    const me: Participant = {
      userId: socket.id,
      username,
      role: "participant", // always Participant on join
      joinedAt: Date.now(),
    };
    room.addParticipant(me);
    enterRoom(socket, room.roomId);

    reply(buildJoinResponse(room, me));

    // Tell everyone ELSE in the room (socket.to excludes the sender)
    socket.to(room.roomId).emit("user_joined", {
      username: me.username,
      userId: me.userId,
      role: me.role,
      participants: room.listParticipants(),
    });
  });
}