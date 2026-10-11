import { Participant, PlayState, Role, RoomState } from "../types";

export class Room {
  readonly roomId: string;
  private videoId: string | null = null;
  private playState: PlayState = "paused";
  private currentTime = 0;          // position (seconds) at the moment of updatedAt
  private updatedAt = Date.now();   // server time (ms) when currentTime was recorded
  private participants = new Map<string, Participant>();

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  // ---------- participants ----------

  addParticipant(participant: Participant): void {
    this.participants.set(participant.userId, participant);
  }

  isUsernameTaken(username: string): boolean {
    const wanted = username.toLowerCase();
    for (const p of this.participants.values()) {
      if (p.username.toLowerCase() === wanted) return true;
    }
    return false;
  }

  listParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getParticipant(userId: string): Participant | undefined {
    return this.participants.get(userId);
  }

  removeParticipant(userId: string): Participant | undefined {
    const participant = this.participants.get(userId);
    this.participants.delete(userId);
    return participant;
  }

  setRole(userId: string, role: Role): Participant | undefined {
    const participant = this.participants.get(userId);
    if (participant) participant.role = role;
    return participant;
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  // Called when the Host left. Oldest Moderator first, otherwise the oldest Participant.
  promoteSuccessor(): Participant | undefined {
    const candidates = this.listParticipants().sort((a, b) => a.joinedAt - b.joinedAt);
    const successor =
      candidates.find((p) => p.role === "moderator") ??
      candidates.find((p) => p.role === "participant");
    if (successor) successor.role = "host";
    return successor;
  }

  // ---------- video state ----------

  getState(): RoomState {
    return {
      videoId: this.videoId,
      playState: this.playState,
      currentTime: this.getLivePosition(),
    };
  }

  hasVideo(): boolean {
    return this.videoId !== null;
  }

  play(): void {
    this.commitPosition();        // bank the current position FIRST
    this.playState = "playing";
  }

  pause(): void {
    this.commitPosition();        // freeze the position at the moment of pause
    this.playState = "paused";
  }

  seek(time: number): void {
    this.currentTime = time;
    this.updatedAt = Date.now();  // playState stays as it was
  }

  changeVideo(videoId: string): void {
    this.videoId = videoId;
    this.currentTime = 0;         // new video starts from the beginning...
    this.updatedAt = Date.now();
    this.playState = "paused";    // ...and paused; the host presses Play
  }

  // Saves "where the video is right now" as the new baseline.
  private commitPosition(): void {
    this.currentTime = this.getLivePosition();
    this.updatedAt = Date.now();
  }

  // The video keeps moving while "playing", but we don't tick a counter.
  // We compute the position on demand from the last known position + elapsed time.
  private getLivePosition(): number {
    if (this.playState === "playing") {
      return this.currentTime + (Date.now() - this.updatedAt) / 1000;
    }
    return this.currentTime;
  }
}