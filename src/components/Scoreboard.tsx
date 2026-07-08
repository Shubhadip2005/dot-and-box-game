import type { RoomData } from "../types";
import { INK_COLORS } from "../types";
import "../styles/room.css";

interface Props {
  room: RoomData;
  playerId: string;
}

export default function Scoreboard({ room, playerId }: Props) {
  const currentTurnId = room.turnOrder[room.currentTurnIndex];
  const players = room.turnOrder.map((id) => room.players[id]).filter(Boolean);

  return (
    <div className="card scoreboard">
      <p className="field-label">Scorecard</p>
      <ul className="score-list">
        {players.map((p) => {
          const isTurn = room.status === "playing" && p.id === currentTurnId;
          return (
            <li key={p.id} className={isTurn ? "score-row active" : "score-row"}>
              <span className="ink-dot" style={{ backgroundColor: INK_COLORS[p.colorIndex].hex }} />
              <span className="player-name">
                {p.name}
                {p.id === playerId && <span className="you-tag">You</span>}
              </span>
              <span className="score-num">{room.scores[p.id] ?? 0}</span>
              {isTurn && <span className="turn-pip" title="Current turn" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
