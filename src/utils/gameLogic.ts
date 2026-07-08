import type { RoomData } from "../types";

/** Horizontal line between dot(r,c) and dot(r,c+1). r: 0..N-1, c: 0..N-2 */
export function hLineId(r: number, c: number): string {
  return `h-${r}-${c}`;
}

/** Vertical line between dot(r,c) and dot(r+1,c). r: 0..N-2, c: 0..N-1 */
export function vLineId(r: number, c: number): string {
  return `v-${r}-${c}`;
}

/** Box with top-left corner dot(r,c). r,c: 0..N-2 */
export function boxId(r: number, c: number): string {
  return `b-${r}-${c}`;
}

export function totalLineCount(n: number): number {
  const horizontal = n * (n - 1);
  const vertical = (n - 1) * n;
  return horizontal + vertical;
}

export function totalBoxCount(n: number): number {
  return (n - 1) * (n - 1);
}

/** The 4 edges bordering a box at (r,c). */
export function boxEdges(r: number, c: number): string[] {
  return [hLineId(r, c), hLineId(r + 1, c), vLineId(r, c), vLineId(r, c + 1)];
}

/**
 * Given a newly-drawn line, return the ids of any boxes that become
 * complete as a result (0, 1, or 2 boxes can complete from a single line).
 */
export function findCompletedBoxes(
  n: number,
  lines: Record<string, string>,
  lineId: string
): string[] {
  const completed: string[] = [];
  const [type, rStr, cStr] = lineId.split("-");
  const r = Number(rStr);
  const c = Number(cStr);

  const candidateBoxes: [number, number][] = [];
  if (type === "h") {
    // Horizontal line h-r-c borders box(r-1, c) above and box(r, c) below
    if (r - 1 >= 0) candidateBoxes.push([r - 1, c]);
    if (r <= n - 2) candidateBoxes.push([r, c]);
  } else {
    // Vertical line v-r-c borders box(r, c-1) to the left and box(r, c) to the right
    if (c - 1 >= 0) candidateBoxes.push([r, c - 1]);
    if (c <= n - 2) candidateBoxes.push([r, c]);
  }

  for (const [br, bc] of candidateBoxes) {
    const edges = boxEdges(br, bc);
    if (edges.every((e) => e === lineId || lines[e])) {
      completed.push(boxId(br, bc));
    }
  }
  return completed;
}

export function isBoardFull(n: number, lines: Record<string, string>): boolean {
  return Object.keys(lines).length >= totalLineCount(n);
}

export function computeWinners(room: RoomData): string[] {
  const scores = room.scores || {};
  let max = -1;
  for (const pid of Object.keys(scores)) {
    if (scores[pid] > max) max = scores[pid];
  }
  return Object.keys(scores).filter((pid) => scores[pid] === max);
}

export function nextTurnIndex(room: RoomData, currentIndex: number): number {
  const count = room.turnOrder.length;
  return (currentIndex + 1) % count;
}
