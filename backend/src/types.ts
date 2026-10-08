export type Role = "host" | "moderator" | "participant";
export type PlayState = "playing" | "paused";

export interface Participant {
  userId: string;   // = socket.id
  username: string;
  role: Role;
  joinedAt: number; // ms timestamp, used later for "oldest user" host transfer
}

export interface RoomState {
  videoId: string | null;
  playState: PlayState;
  currentTime: number; // live position in seconds
}