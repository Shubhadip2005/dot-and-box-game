import { ref, set, get, runTransaction, onValue, off, remove } from "firebase/database";
import { db } from "../firebase";
import type { RoomData, Player } from "../types";
import { generatePlayerId, generateRoomId } from "./roomUtils";
import {
  findCompletedBoxes,
  isBoardFull,
  computeWinners,
  nextTurnIndex,
} from "./gameLogic";

const ROOMS_PATH = "rooms";

export function localIdentityKey(roomId: string): string {
  return `dots-and-boxes:${roomId}:playerId`;
}

export async function createRoom(
  hostName: string,
  gridSize: number,
  maxPlayers: number
): Promise<{ roomId: string; playerId: string }> {
  const playerId = generatePlayerId();
  let roomId = generateRoomId();

  // Guard against the rare id collision.
  for (let attempts = 0; attempts < 5; attempts++) {
    const snap = await get(ref(db, `${ROOMS_PATH}/${roomId}`));
    if (!snap.exists()) break;
    roomId = generateRoomId();
  }

  const host: Player = {
    id: playerId,
    name: hostName.trim().slice(0, 20) || "Player 1",
    colorIndex: 0,
    joinedAt: Date.now(),
    isHost: true,
  };

  const room: RoomData = {
    gridSize,
    maxPlayers,
    status: "waiting",
    hostId: playerId,
    players: { [playerId]: host },
    turnOrder: [],
    currentTurnIndex: 0,
    lines: {},
    boxes: {},
    scores: { [playerId]: 0 },
    createdAt: Date.now(),
    winnerIds: null,
  };

  await set(ref(db, `${ROOMS_PATH}/${roomId}`), room);
  localStorage.setItem(localIdentityKey(roomId), playerId);
  return { roomId, playerId };
}

export async function joinRoom(
  roomId: string,
  name: string
): Promise<{ playerId: string } | { error: string }> {
  const existing = localStorage.getItem(localIdentityKey(roomId));
  const roomSnap = await get(ref(db, `${ROOMS_PATH}/${roomId}`));
  if (!roomSnap.exists()) return { error: "Room not found. Check the room ID." };
  const room = roomSnap.val() as RoomData;

  if (existing && room.players && room.players[existing]) {
    return { playerId: existing };
  }

  if (room.status !== "waiting") {
    return { error: "This game has already started." };
  }
  if (Object.keys(room.players || {}).length >= room.maxPlayers) {
    return { error: "Room is full." };
  }

  const playerId = generatePlayerId();
  const result = await runTransaction(ref(db, `${ROOMS_PATH}/${roomId}`), (current: RoomData | null) => {
    if (!current) return current;
    if (current.status !== "waiting") return current; // abort silently, checked above too
    const count = Object.keys(current.players || {}).length;
    if (count >= current.maxPlayers) return current;

    const colorIndex = count % 4;
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || `Player ${count + 1}`,
      colorIndex,
      joinedAt: Date.now(),
      isHost: false,
    };
    current.players = { ...(current.players || {}), [playerId]: player };
    current.scores = { ...(current.scores || {}), [playerId]: 0 };
    return current;
  });

  if (!result.committed || !result.snapshot.exists()) {
    return { error: "Could not join the room. It may be full or already started." };
  }
  const finalRoom = result.snapshot.val() as RoomData;
  if (!finalRoom.players[playerId]) {
    return { error: "Room is full." };
  }

  localStorage.setItem(localIdentityKey(roomId), playerId);
  return { playerId };
}

export async function startGame(roomId: string, requesterId: string): Promise<void> {
  await runTransaction(ref(db, `${ROOMS_PATH}/${roomId}`), (current: RoomData | null) => {
    if (!current) return current;
    if (current.hostId !== requesterId) return current;
    if (current.status !== "waiting") return current;
    const playerIds = Object.keys(current.players || {});
    if (playerIds.length < 2) return current;

    // Shuffle turn order.
    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    current.turnOrder = shuffled;
    current.currentTurnIndex = 0;
    current.status = "playing";
    return current;
  });
}

/**
 * Attempt to draw a line. Runs as a single atomic transaction over the
 * whole room so simultaneous clicks from different players can never
 * both "win" the same line, and box/score/turn updates stay consistent.
 */
export async function drawLine(
  roomId: string,
  lineId: string,
  playerId: string
): Promise<void> {
  await runTransaction(ref(db, `${ROOMS_PATH}/${roomId}`), (current: RoomData | null) => {
    if (!current) return current;
    if (current.status !== "playing") return current;
    if (current.turnOrder[current.currentTurnIndex] !== playerId) return current;
    if (current.lines && current.lines[lineId]) return current; // already drawn

    const n = current.gridSize;
    const lines = { ...(current.lines || {}), [lineId]: playerId };
    const completedBoxIds = findCompletedBoxes(n, current.lines || {}, lineId);

    const boxes = { ...(current.boxes || {}) };
    const scores = { ...(current.scores || {}) };
    for (const bId of completedBoxIds) {
      boxes[bId] = playerId;
      scores[playerId] = (scores[playerId] || 0) + 1;
    }

    current.lines = lines;
    current.boxes = boxes;
    current.scores = scores;

    if (isBoardFull(n, lines)) {
      current.status = "finished";
      current.winnerIds = computeWinners(current);
    } else if (completedBoxIds.length === 0) {
      current.currentTurnIndex = nextTurnIndex(current, current.currentTurnIndex);
    }
    // else: player completed at least one box -> keep the turn (currentTurnIndex unchanged)

    return current;
  });
}

export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  const roomRef = ref(db, `${ROOMS_PATH}/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const room = snap.val() as RoomData;

  if (room.status === "waiting") {
    // Safe to fully remove the player before the game starts.
    await runTransaction(roomRef, (current: RoomData | null) => {
      if (!current) return current;
      const players = { ...(current.players || {}) };
      delete players[playerId];
      current.players = players;
      const scores = { ...(current.scores || {}) };
      delete scores[playerId];
      current.scores = scores;

      if (Object.keys(players).length === 0) {
        return null; // delete the room entirely
      }
      if (current.hostId === playerId) {
        current.hostId = Object.keys(players)[0];
        players[current.hostId].isHost = true;
      }
      return current;
    });
  }
  // If the game is already in progress we intentionally leave the player's
  // data intact so scores/turn order stay consistent; they can rejoin.
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: RoomData | null) => void
): () => void {
  const roomRef = ref(db, `${ROOMS_PATH}/${roomId}`);
  const listener = onValue(
    roomRef,
    (snap) => callback(snap.exists() ? (snap.val() as RoomData) : null),
    () => callback(null)
  );
  return () => off(roomRef, "value", listener);
}

export async function deleteRoomIfEmpty(roomId: string): Promise<void> {
  const snap = await get(ref(db, `${ROOMS_PATH}/${roomId}`));
  if (snap.exists()) {
    const room = snap.val() as RoomData;
    if (Object.keys(room.players || {}).length === 0) {
      await remove(ref(db, `${ROOMS_PATH}/${roomId}`));
    }
  }
}
