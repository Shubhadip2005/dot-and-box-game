# Dots & Boxes — Multiplayer

A real-time multiplayer Dots and Boxes game. 5×5 to 10×10 dot grids, 2–4 players,
room-code based matchmaking, built with Vite + React + TypeScript and Firebase
Realtime Database for live sync.

## Game rules implemented

- Grid size N is chosen by the room host, 5–10 dots per side.
- Players take turns drawing one line between two horizontally/vertically
  adjacent dots that don't already have a line.
- Completing the 4th side of a 1×1 box scores that player a point, fills the
  box with their initial in their ink color, and **grants them another turn**
  (including chained multi-box turns).
- If a move scores no box, the turn passes to the next player.
- The game ends when every possible line has been drawn. Highest score wins;
  equal top scores are shown as a tie.

## Folder structure

```
dots-and-boxes/
├── index.html                  Vite HTML entry point (loads Google Fonts)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── database.rules.json         Firebase Realtime Database security rules
├── .env.example                Copy to .env and fill with your Firebase config
├── .gitignore
└── src/
    ├── main.tsx                React root + router mount
    ├── App.tsx                 Route table ("/" and "/room/:roomId")
    ├── firebase.ts             Firebase app + Realtime Database init
    ├── types.ts                Shared TS types + ink color palette
    ├── vite-env.d.ts           import.meta.env typings
    ├── utils/
    │   ├── gameLogic.ts        Pure functions: line/box ids, box-completion
    │   │                       detection, win detection (unit-testable,
    │   │                       no Firebase dependency)
    │   ├── roomUtils.ts        Room ID generation, player ID generation
    │   └── roomActions.ts      All Firebase reads/writes: createRoom,
    │                           joinRoom, startGame, drawLine, leaveRoom,
    │                           subscribeToRoom
    ├── components/
    │   ├── Home.tsx            Landing page: create room / join room forms
    │   ├── RoomPage.tsx        Subscribes to the room; routes to Lobby or
    │   │                       GameBoard; handles "joined via shared link"
    │   ├── Lobby.tsx           Waiting room: player list, room code, host's
    │   │                       "Start game" control
    │   ├── GameBoard.tsx       SVG dot grid, line click handling, box fills,
    │   │                       turn/finished banner
    │   └── Scoreboard.tsx      Side panel: players, scores, whose turn it is
    └── styles/
        ├── theme.css           Design tokens (color, type, buttons, inputs)
        ├── home.css            Landing page layout
        ├── room.css            Lobby + scoreboard + page layout
        └── board.css           SVG line hit-target styling
```

## How the multiplayer sync works

Everything lives under a single Realtime Database path: `rooms/{roomId}`.

```
rooms/
  K7QXM/
    gridSize: 6
    maxPlayers: 2
    status: "waiting" | "playing" | "finished"
    hostId: "p_..."
    players: { "p_...": { id, name, colorIndex, joinedAt, isHost } }
    turnOrder: ["p_...", "p_..."]
    currentTurnIndex: 0
    lines: { "h-0-0": "p_...", "v-2-3": "p_..." }
    boxes: { "b-0-0": "p_..." }
    scores: { "p_...": 3 }
    winnerIds: null | ["p_..."]
```

Every line draw runs as a single Firebase `runTransaction` over the **entire
room object** — it validates whose turn it is, whether the line is already
taken, computes any completed boxes, updates scores, and decides the next
turn, all atomically. This is deliberate: if two players tap different lines
at the same instant, Firebase resolves the transaction conflict by retrying
against the latest server value, so a line can never be double-claimed and
the turn order can never desync.

Each browser stores its own `playerId` in `localStorage` (keyed per room), so
refreshing the page or reopening the tab keeps you as the same player.

## Firebase Console setup

1. Go to <https://console.firebase.google.com> and click **Add project**.
   Give it any name (e.g. `dots-and-boxes`) and finish the wizard (Google
   Analytics is optional, you can skip it).
2. In the left sidebar, open **Build → Realtime Database** and click
   **Create Database**.
   - Choose a location.
   - Start in **test mode** for now (we'll apply the rules file instead).
3. Once created, go to the **Rules** tab of the Realtime Database and paste
   the contents of `database.rules.json` from this project, then **Publish**.
   - These rules allow open read/write on the `rooms/` path since the game
     has no login system — anyone with a room code can play. If you want to
     lock this down further later, add Firebase Anonymous Auth and restrict
     writes to `auth != null`.
4. Register a web app: in **Project settings → General → Your apps**, click
   the `</>` (web) icon, give it a nickname, and skip Firebase Hosting setup.
5. Copy the `firebaseConfig` values shown into a `.env` file in this project
   (copy `.env.example` to `.env` first):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...      # e.g. https://<project>-default-rtdb.<region>.firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

   The `databaseURL` isn't shown by default in the `firebaseConfig` snippet
   on older Firebase console versions — grab it from the top of the Realtime
   Database page instead (it looks like
   `https://<project-id>-default-rtdb.<region>.firebasedatabase.app`).

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`) in two or more
browser tabs/windows (or devices on the same network) to test multiplayer —
create a room in one tab, copy the room code, and join from another.

## Build & deploy

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

To deploy on Vercel: import the repo, set the framework preset to **Vite**,
and add the same `VITE_FIREBASE_*` variables under Project Settings →
Environment Variables.

## Notes on scaling / next steps

- Grid sizes above ~8 get visually dense on small phone screens; the SVG is
  responsive but you may want to add pinch-zoom for very small viewports.
- There's no reconnect/AFK timeout logic — if a player closes the tab
  mid-game their turn will simply wait. A natural next step is a per-turn
  timer that auto-skips an inactive player.
- No authentication is used, so player identity is just a random ID stored
  in `localStorage`. Good enough for casual play with friends; add Firebase
  Anonymous Auth if you want tighter room security.
