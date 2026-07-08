export type RoomStatus = "waiting" | "playing" | "finished";

export interface Player {
  id: string;
  name: string;
  colorIndex: number;
  joinedAt: number;
  isHost: boolean;
}

export interface RoomData {
  gridSize: number;
  maxPlayers: number;
  status: RoomStatus;
  hostId: string;
  players: Record<string, Player>;
  turnOrder: string[];
  currentTurnIndex: number;
  lines: Record<string, string>;
  boxes: Record<string, string>;
  scores: Record<string, number>;
  createdAt: number;
  winnerIds: string[] | null;
}

export const INK_COLORS = [
  { name: "Indigo", hex: "#2E4374" },
  { name: "Crimson", hex: "#A6303F" },
  { name: "Forest", hex: "#2F6B4F" },
  { name: "Amber", hex: "#B4791C" },
] as const;
