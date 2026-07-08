import { useNavigate } from "react-router-dom";
import type { RoomData } from "../types";
import { INK_COLORS } from "../types";
import { leaveRoom, startGame } from "../utils/roomActions";
import "../styles/room.css";

interface Props {
  room: RoomData;
  roomId: string;
  playerId: string;
}

export default function Lobby({ room, roomId, playerId }: Props) {
  const navigate = useNavigate();
  const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
  const isHost = room.hostId === playerId;
  const canStart = isHost && players.length >= 2;

  async function handleStart() {
    await startGame(roomId, playerId);
  }

  async function handleLeave() {
    await leaveRoom(roomId, playerId);
    navigate("/");
  }

  return (
    <div className="home-page">
      <div className="card home-card lobby-card">
        <p className="field-label">Waiting for players</p>
        <div className="room-code-row">
          <span className="room-code-stamp">{roomId}</span>
          <button
            className="ink-button secondary copy-btn"
            type="button"
            onClick={() => navigator.clipboard.writeText(roomId)}
          >
            Copy code
          </button>
        </div>

        <p className="field-hint" style={{ margin: "1rem 0 1.4rem" }}>
          {room.gridSize} × {room.gridSize} dots · {(room.gridSize - 1) * (room.gridSize - 1)} boxes ·
          up to {room.maxPlayers} players
        </p>

        <ul className="player-list">
          {players.map((p, i) => (
            <li key={p.id} className="player-row">
              <span
                className="ink-dot"
                style={{ backgroundColor: INK_COLORS[p.colorIndex]?.hex ?? INK_COLORS[i % 4].hex }}
              />
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="host-tag">Host</span>}
              {p.id === playerId && <span className="you-tag">You</span>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, room.maxPlayers - players.length) }).map((_, i) => (
            <li key={`empty-${i}`} className="player-row empty">
              <span className="ink-dot empty" />
              <span className="player-name">Waiting for player…</span>
            </li>
          ))}
        </ul>

        {isHost ? (
          <button className="ink-button" onClick={handleStart} disabled={!canStart}>
            {canStart ? "Start game" : "Need at least 2 players"}
          </button>
        ) : (
          <p className="field-hint">Waiting for the host to start the game…</p>
        )}

        <button className="ink-button secondary" style={{ marginTop: "0.7rem" }} onClick={handleLeave}>
          Leave room
        </button>
      </div>
    </div>
  );
}
