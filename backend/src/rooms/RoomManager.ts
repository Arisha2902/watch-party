import { Room } from "./Room";
import { generateRoomCode } from "../utils/roomCode";

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(): Room {
    let roomId: string;
    do {
      roomId = generateRoomCode();
    } while (this.rooms.has(roomId)); // guarantee uniqueness

    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}