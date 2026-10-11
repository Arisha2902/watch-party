import { Role } from "./types";

export type Action =
  | "play"
  | "pause"
  | "seek"
  | "change_video"
  | "assign_role"
  | "remove_participant";

// Chat and reactions are deliberately NOT here: every member of a room may use them.
const PERMISSIONS: Record<Role, readonly Action[]> = {
  host: ["play", "pause", "seek", "change_video", "assign_role", "remove_participant"],
  moderator: ["play", "pause", "seek", "change_video"],
  participant: [],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].includes(action);
}

// "host" is deliberately NOT assignable via assign_role: a room has exactly one Host.
// The Host never changes hands while present. It only passes on automatically if the Host leaves.
export type AssignableRole = Exclude<Role, "host">;
const ASSIGNABLE_ROLES: readonly string[] = ["moderator", "participant"];

export function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === "string" && ASSIGNABLE_ROLES.includes(value);
}