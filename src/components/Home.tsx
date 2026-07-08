import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, joinRoom } from "../utils/roomActions";
import "../styles/home.css";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");

  const [name, setName] = useState("");
  const [gridSize, setGridSize] = useState(6);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [roomCode, setRoomCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { roomId } = await createRoom(name, gridSize, maxPlayers);
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error(err);
      setError("Could not create the room. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter a room code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await joinRoom(roomCode.trim().toUpperCase(), name);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (err) {
      console.error(err);
      setError("Could not join the room. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <p className="home-eyebrow">a game of ink &amp; edges</p>
        <h1 className="home-title">Dots &amp; Boxes</h1>
        <p className="home-subtitle">
          Claim a line, close a box, sign it with your ink. Play with 2 to 4 friends in real time.
        </p>
      </header>

      <div className="home-card card">
        <div className="mode-toggle">
          <button
            className={mode === "create" ? "mode-tab active" : "mode-tab"}
            onClick={() => setMode("create")}
            type="button"
          >
            Create room
          </button>
          <button
            className={mode === "join" ? "mode-tab active" : "mode-tab"}
            onClick={() => setMode("join")}
            type="button"
          >
            Join room
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="text-input"
            style={{ fontFamily: "var(--font-body)" }}
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shubhadip"
          />
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="form-body">
            <div className="field">
              <label className="field-label">Grid size — {gridSize} × {gridSize} dots</label>
              <input
                type="range"
                min={5}
                max={10}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="range-input"
              />
              <p className="field-hint">
                {(gridSize - 1) * (gridSize - 1)} boxes to win
              </p>
            </div>

            <div className="field">
              <label className="field-label">Players — {maxPlayers}</label>
              <div className="segmented">
                {[2, 3, 4].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={maxPlayers === n ? "segment active" : "segment"}
                    onClick={() => setMaxPlayers(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="ink-button" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create room"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="form-body">
            <div className="field">
              <label className="field-label" htmlFor="roomCode">
                Room code
              </label>
              <input
                id="roomCode"
                className="text-input room-code-input"
                value={roomCode}
                maxLength={6}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7QXM"
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="ink-button" type="submit" disabled={loading}>
              {loading ? "Joining…" : "Join room"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
