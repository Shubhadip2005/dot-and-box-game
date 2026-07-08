import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RoomData } from "../types";
import { joinRoom, leaveRoom, localIdentityKey, subscribeToRoom } from "../utils/roomActions";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";
import "../styles/room.css";

export default function RoomPage() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomData | null | undefined>(undefined); // undefined = loading
  const [playerId, setPlayerId] = useState<string | null>(
    () => localStorage.getItem(localIdentityKey(roomId))
  );
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, setRoom);
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    function handleUnload() {
      if (playerId) leaveRoom(roomId, playerId);
    }
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [roomId, playerId]);

  async function handleJoinByLink(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) {
      setJoinError("Enter your name first.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    const result = await joinRoom(roomId, joinName);
    setJoining(false);
    if ("error" in result) {
      setJoinError(result.error);
      return;
    }
    setPlayerId(result.playerId);
  }

  if (room === undefined) {
    return <CenteredMessage>Opening the room…</CenteredMessage>;
  }

  if (room === null) {
    return (
      <CenteredMessage>
        <p>This room doesn't exist anymore.</p>
        <button className="ink-button secondary" onClick={() => navigate("/")}>
          Back home
        </button>
      </CenteredMessage>
    );
  }

  const isKnownPlayer = !!(playerId && room.players[playerId]);

  if (!isKnownPlayer) {
    return (
      <div className="home-page">
        <div className="card home-card">
          <p className="field-label">Room {roomId}</p>
          <h2 style={{ marginBottom: "1rem" }}>Join this game</h2>
          <form onSubmit={handleJoinByLink} className="form-body">
            <div className="field">
              <label className="field-label" htmlFor="joinName">
                Your name
              </label>
              <input
                id="joinName"
                className="text-input"
                style={{ fontFamily: "var(--font-body)" }}
                value={joinName}
                maxLength={20}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Shubhadip"
              />
            </div>
            {joinError && <p className="error-text">{joinError}</p>}
            <button className="ink-button" type="submit" disabled={joining}>
              {joining ? "Joining…" : "Join room"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (room.status === "waiting") {
    return <Lobby room={room} roomId={roomId} playerId={playerId!} />;
  }

  return <GameBoard room={room} roomId={roomId} playerId={playerId!} />;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="home-page" style={{ textAlign: "center", paddingTop: "6rem" }}>
      {children}
    </div>
  );
}
