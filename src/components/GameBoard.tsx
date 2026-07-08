import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RoomData } from "../types";
import { INK_COLORS } from "../types";
import { hLineId, vLineId, boxId } from "../utils/gameLogic";
import { inkJitter } from "../utils/roomUtils";
import { drawLine, leaveRoom } from "../utils/roomActions";
import Scoreboard from "./Scoreboard";
import "../styles/room.css";
import "../styles/board.css";

interface Props {
  room: RoomData;
  roomId: string;
  playerId: string;
}

const CELL = 62;
const PAD = 26;

export default function GameBoard({ room, roomId, playerId }: Props) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const n = room.gridSize;
  const size = PAD * 2 + (n - 1) * CELL;

  // Firebase Realtime Database never stores empty objects — it strips
  // `lines: {}` / `boxes: {}` entirely from the payload. Right after a game
  // starts (or on a very sparse board) those keys can come back as
  // `undefined`, so we always fall back to an empty object here.
  const roomLines = room.lines || {};
  const roomBoxes = room.boxes || {};

  const isMyTurn = room.status === "playing" && room.turnOrder[room.currentTurnIndex] === playerId;
  const currentPlayer = room.status === "playing" ? room.players[room.turnOrder[room.currentTurnIndex]] : null;

  const hLines = useMemo(() => {
    const arr: { id: string; r: number; c: number }[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n - 1; c++) arr.push({ id: hLineId(r, c), r, c });
    }
    return arr;
  }, [n]);

  const vLines = useMemo(() => {
    const arr: { id: string; r: number; c: number }[] = [];
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n; c++) arr.push({ id: vLineId(r, c), r, c });
    }
    return arr;
  }, [n]);

  const boxes = useMemo(() => {
    const arr: { id: string; r: number; c: number }[] = [];
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) arr.push({ id: boxId(r, c), r, c });
    }
    return arr;
  }, [n]);

  async function handleLineClick(lineId: string) {
    if (!isMyTurn || roomLines[lineId] || pending) return;
    setPending(lineId);
    try {
      await drawLine(roomId, lineId, playerId);
    } finally {
      setPending(null);
    }
  }

  async function handleLeave() {
    await leaveRoom(roomId, playerId);
    navigate("/");
  }

  function dotXY(r: number, c: number) {
    return [PAD + c * CELL, PAD + r * CELL] as const;
  }

  function inkFor(pId: string | undefined) {
    if (!pId) return "var(--ink-faint)";
    const p = room.players[pId];
    return p ? INK_COLORS[p.colorIndex].hex : "var(--ink-faint)";
  }

  return (
    <div className="game-page">
      <div className="game-layout">
        <div className="board-column">
          <div className="board-status card">
            {room.status === "playing" && currentPlayer && (
              <p className="status-text">
                <span
                  className="ink-dot inline"
                  style={{ backgroundColor: INK_COLORS[currentPlayer.colorIndex].hex }}
                />
                {isMyTurn ? "Your turn" : `${currentPlayer.name}'s turn`} — draw a line
              </p>
            )}
            {room.status === "finished" && <FinishedBanner room={room} playerId={playerId} />}
          </div>

          <div className="board-wrap card">
            <svg viewBox={`0 0 ${size} ${size}`} className="board-svg" role="img" aria-label="Dots and boxes board">
              {/* Completed boxes */}
              {boxes.map(({ id, r, c }) => {
                const owner = roomBoxes[id];
                if (!owner) return null;
                const [x, y] = dotXY(r, c);
                const cx = x + CELL / 2;
                const cy = y + CELL / 2;
                const color = inkFor(owner);
                const initial = room.players[owner]?.name?.trim()?.[0]?.toUpperCase() ?? "?";
                const rot = (inkJitter(id) * 8).toFixed(1);
                return (
                  <g key={id}>
                    <rect
                      x={x + 3}
                      y={y + 3}
                      width={CELL - 6}
                      height={CELL - 6}
                      rx={4}
                      fill={color}
                      opacity={0.12}
                    />
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="var(--font-display)"
                      fontStyle="italic"
                      fontWeight={600}
                      fontSize={CELL * 0.4}
                      fill={color}
                      transform={`rotate(${rot} ${cx} ${cy})`}
                    >
                      {initial}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal lines */}
              {hLines.map(({ id, r, c }) => {
                const owner = roomLines[id];
                const [x1, y1] = dotXY(r, c);
                const x2 = x1 + CELL;
                const jitter = inkJitter(id) * 3;
                const midX = (x1 + x2) / 2;
                const midY = y1 + jitter;
                return (
                  <g key={id}>
                    {owner ? (
                      <path
                        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y1}`}
                        stroke={inkFor(owner)}
                        strokeWidth={5}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y1}
                        className={isMyTurn ? "line-hit" : "line-hit disabled"}
                        onClick={() => handleLineClick(id)}
                      />
                    )}
                  </g>
                );
              })}

              {/* Vertical lines */}
              {vLines.map(({ id, r, c }) => {
                const owner = roomLines[id];
                const [x1, y1] = dotXY(r, c);
                const y2 = y1 + CELL;
                const jitter = inkJitter(id) * 3;
                const midY = (y1 + y2) / 2;
                const midX = x1 + jitter;
                return (
                  <g key={id}>
                    {owner ? (
                      <path
                        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x1} ${y2}`}
                        stroke={inkFor(owner)}
                        strokeWidth={5}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x1}
                        y2={y2}
                        className={isMyTurn ? "line-hit" : "line-hit disabled"}
                        onClick={() => handleLineClick(id)}
                      />
                    )}
                  </g>
                );
              })}

              {/* Dots on top */}
              {Array.from({ length: n }).map((_, r) =>
                Array.from({ length: n }).map((_, c) => {
                  const [x, y] = dotXY(r, c);
                  return <circle key={`dot-${r}-${c}`} cx={x} cy={y} r={4.5} fill="var(--ink-text)" />;
                })
              )}
            </svg>
          </div>

          <button className="ink-button secondary" style={{ marginTop: "1rem" }} onClick={handleLeave}>
            Leave game
          </button>
        </div>

        <div className="side-column">
          <Scoreboard room={room} playerId={playerId} />
        </div>
      </div>
    </div>
  );
}

function FinishedBanner({ room, playerId }: { room: RoomData; playerId: string }) {
  const winnerIds = room.winnerIds ?? [];
  const iWon = winnerIds.includes(playerId);
  const names = winnerIds.map((id) => room.players[id]?.name).filter(Boolean);
  const isTie = winnerIds.length > 1;

  let message: string;
  if (isTie) {
    message = `It's a tie between ${names.join(" & ")}!`;
  } else if (iWon) {
    message = "You win!";
  } else {
    message = `${names[0] ?? "A player"} wins!`;
  }

  return <p className="status-text finished">{message}</p>;
}
