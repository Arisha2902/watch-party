import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { Room } from "../rooms/Room";
import { Participant } from "../types";
import { normalizeRoomCode } from "../utils/roomCode";
import { can, isAssignableRole } from "../permissions"; // NEW

const MAX_USERNAME_LENGTH = 20;
const USERNAME_ERROR = `Username must be 1-${MAX_USERNAME_LENGTH} characters.`;
const NOT_IN_ROOM = "You are not in a room."; // NEW

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

function toReply(ack: unknown): (response: object) => void {
  return typeof ack === "function" ? (ack as (r: object) => void) : () => {};
}

// ---------- shared helpers ----------

function enterRoom(socket: Socket, roomId: string): void {
  socket.join(roomId);
  socket.data.roomId = roomId;
}

function buildJoinResponse(room: Room, me: Participant) {
  return {
    ok: true,
    roomId: room.roomId,
    userId: me.userId,
    role: me.role,
    participants: room.listParticipants(),
    state: room.getState(),
  };
}

// NEW: "Who is this socket and which room is it in?" Answered ONLY from
// server-side records (socket.id + socket.data.roomId), never from the payload.
function getContext(
  socket: Socket,
  rooms: RoomManager
): { room: Room; me: Participant } | null {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) return null;
  const room = rooms.getRoom(roomId);
  const me = room?.getParticipant(socket.id);
  return room && me ? { room, me } : null;
}

// NEW: used by leave_room AND by disconnect. Safe to call twice.
function leaveRoom(io: Server, socket: Socket, rooms: RoomManager): void {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) return; // not in a room (or already left): nothing to do

  socket.leave(roomId);
  socket.data.roomId = undefined;

  const room = rooms.getRoom(roomId);
  const left = room?.removeParticipant(socket.id);
  if (!room || !left) return;

  io.to(roomId).emit("user_left", {
    username: left.username,
    userId: left.userId,
    participants: room.listParticipants(),
  });
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
      role: "host",
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
      role: "participant",
      joinedAt: Date.now(),
    };
    room.addParticipant(me);
    enterRoom(socket, room.roomId);

    reply(buildJoinResponse(room, me));

    socket.to(room.roomId).emit("user_joined", {
      username: me.username,
      userId: me.userId,
      role: me.role,
      participants: room.listParticipants(),
    });
  });

  // NEW
  socket.on("leave_room", (_payload: unknown, ack: unknown) => {
    leaveRoom(io, socket, rooms);
    toReply(ack)({ ok: true });
  });

  // NEW
  socket.on("disconnect", () => {
    leaveRoom(io, socket, rooms);
  });

  // NEW
  socket.on("assign_role", (payload: unknown, ack: unknown) => {
    const reply = toReply(ack);

    const ctx = getContext(socket, rooms);
    if (!ctx) return reply({ ok: false, error: NOT_IN_ROOM });
    const { room, me } = ctx;

    // 1. Permission check FIRST, using the role the SERVER has stored for this socket
    if (!can(me.role, "assign_role")) {
      return reply({ ok: false, error: "Only the host can assign roles." });
    }

    // 2. Only then validate the payload
    const body = asObject(payload);
    const newRole = body.role;
    if (!isAssignableRole(newRole)) {
      return reply({ ok: false, error: "Invalid role. Choose moderator or participant." });
    }
    const target =
      typeof body.userId === "string" ? room.getParticipant(body.userId) : undefined;
    if (!target) return reply({ ok: false, error: "That user is not in this room." });
    if (target.userId === me.userId) {
      return reply({ ok: false, error: "You can't change your own role." });
    }

    // 3. Update state, then broadcast to everyone (including the host)
    room.setRole(target.userId, newRole);
    io.to(room.roomId).emit("role_assigned", {
      userId: target.userId,
      username: target.username,
      role: newRole,
      participants: room.listParticipants(),
    });
    reply({ ok: true });
  });

  // NEW
  socket.on("remove_participant", (payload: unknown, ack: unknown) => {
    const reply = toReply(ack);

    const ctx = getContext(socket, rooms);
    if (!ctx) return reply({ ok: false, error: NOT_IN_ROOM });
    const { room, me } = ctx;

    if (!can(me.role, "remove_participant")) {
      return reply({ ok: false, error: "Only the host can remove participants." });
    }

    const userId = asObject(payload).userId;
    const target = typeof userId === "string" ? room.getParticipant(userId) : undefined;
    if (!target) return reply({ ok: false, error: "That user is not in this room." });
    if (target.userId === me.userId) {
      return reply({ ok: false, error: "You can't remove yourself." });
    }

    room.removeParticipant(target.userId);

    // userId === socket.id, so we can find the kicked user's socket directly
    const targetSocket = io.sockets.sockets.get(target.userId);
    if (targetSocket) {
      targetSocket.emit("removed_from_room", { roomId: room.roomId }); // tell THEM first
      targetSocket.leave(room.roomId);  // stop receiving this room's broadcasts
      targetSocket.data.roomId = undefined;
    }

    // Everyone still in the room
    io.to(room.roomId).emit("participant_removed", {
      userId: target.userId,
      username: target.username,
      participants: room.listParticipants(),
    });
    reply({ ok: true });
  });
}