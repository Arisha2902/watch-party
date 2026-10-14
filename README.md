# YouTube Watch Party

Watch YouTube videos together in real time. One person creates a room and becomes the **Host**; friends join with a room code or invite link. When the Host (or a Moderator) plays, pauses, seeks or changes the video, **everyone in the room sees the same thing**, synchronized over WebSockets.

> **Live demo:** `https://watch-party-seven-jade.vercel.app/` &nbsp;&larr; **TODO: replace with your real Vercel URL after deploying and testing it**
> **Backend (WebSocket server):** `https://watch-party-k0xh.onrender.com/` &nbsp;&larr; **TODO: replace with your real Render URL**
>
> The backend runs on Render's free tier, which sleeps after about 15 minutes of inactivity. The first connection after a pause can take 30 to 60 seconds; the app shows a "Connecting to the server..." banner while it wakes up.

<!-- Screenshots: add images to a /screenshots folder and uncomment
![Home page](screenshots/home.png)
![Watch room](screenshots/room.png)
-->

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture overview](#architecture-overview)
4. [WebSocket architecture](#websocket-architecture)
5. [Roles and permissions](#roles-and-permissions)
6. [Project structure](#project-structure)
7. [Local setup](#local-setup)
8. [Environment variables](#environment-variables)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Security notes](#security-notes)
12. [Known limitations](#known-limitations)
13. [Future improvements](#future-improvements)

## Features

**Core (assignment requirements)**

- Create a room: the creator automatically becomes the Host; the room gets a unique 6-character code
- Join a room by code or by invite link; joiners become Participants by default
- Live participant list showing each person's role, updating as people join, leave, are promoted or are removed
- Roles: **Host**, **Moderator**, **Participant**, enforced on the backend
- Host can promote a Participant to Moderator (and demote back) and remove participants
- Play, pause, seek and change-video synchronization through the YouTube IFrame Player API
- Late joiners start at the current position (playing or paused), not at 0:00
- Error handling: invalid room, duplicate username, invalid YouTube URL, unauthorized actions, removed participants, lost connection
- Disconnect handling: the participant list updates; if the Host leaves, the role passes automatically; empty rooms are deleted

**Bonus (from the assignment's bonus list)**

- Text chat in the room
- Emoji reactions that float over the video
- OOP structure on the server (`Room` and `RoomManager` classes)

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Vite, React Router (JavaScript) | UI, routing (`/room/:code` invite links) |
| Realtime | Socket.IO (WebSocket with long-polling fallback) | Bidirectional events, rooms, acknowledgements |
| Backend | Node.js, Express, TypeScript | HTTP health check, Socket.IO server, room logic |
| Video | YouTube IFrame Player API | Embedded, controllable player |
| Storage | In-memory `Map` | Active rooms (no database needed for the MVP) |
| Hosting | Render (backend), Vercel (frontend) | Public deployment |

## Architecture overview

```
 Browser A (Host)                          Browser B (Participant)
 React + YouTube IFrame Player             React + YouTube IFrame Player
        |  ^                                       ^  |
        |  |           Socket.IO (WebSocket)       |  |
        v  |                                       |  v
 +-----------------------------------------------------------+
 |           Node.js + Express + Socket.IO server            |
 |  1. Identify the user     (socket.id + socket.data.roomId)|
 |  2. Check the role        (permissions.can(role, action)) |
 |  3. Update the Room       (in-memory Map<roomId, Room>)   |
 |  4. Broadcast to the room (io.to(roomId).emit(...))       |
 +-----------------------------------------------------------+
```

**The server is the single source of truth.** Clients never tell other clients what to do. A client sends a *request*; the server validates it, updates its own state, then tells **everyone, including the sender**, the new state. Every player only *applies* the state it receives.

**HTTP vs WebSocket.** HTTP is request and response: the client always starts and the server cannot push. A WebSocket is one long-lived two-way connection, so the server can push "Host paused" the instant it happens. This app uses HTTP only for `GET /health`; everything else goes over Socket.IO.

**How synchronization works**

- The server stores `videoId`, `playState`, `currentTime` and `updatedAt` (when `currentTime` was recorded).
- While playing, the live position is computed on demand: `currentTime + (now - updatedAt) / 1000`. No per-second timer is needed, and a user joining at 02:15 starts near 135 s.
- The player never emits events. Only human actions (button clicks, slider release) send requests, so a remote seek cannot bounce back and create a loop.
- Clients seek only if they are more than 0.5 s away from the server's position, to avoid constant tiny jumps.

## WebSocket architecture

Most client-to-server events use acknowledgement callbacks and reply with `{ ok: true }` or `{ ok: false, error }`.

| Event | Direction | Payload | Who may send | What happens |
|---|---|---|---|---|
| `create_room` | client to server | `{ username }` | anyone | Creates a room; sender becomes Host |
| `join_room` | client to server | `{ roomId, username }` | anyone | Adds a Participant; ack carries the full room state; others get `user_joined` |
| `leave_room` | client to server | `{}` | member | Removes the user, `user_left`, host succession, empty-room cleanup |
| `sync_state` | server to clients | `{ videoId, playState, currentTime }` | server | Broadcast after every playback change |
| `play`, `pause` | client to server | `{}` | Host, Moderator | Updates state, broadcasts `sync_state` |
| `seek` | client to server | `{ time }` | Host, Moderator | Validates a finite number from 0 to 24 h, broadcasts |
| `change_video` | client to server | `{ videoId }` | Host, Moderator | Validates the 11-character ID, resets to 0:00 paused, broadcasts |
| `assign_role` | client to server | `{ userId, role }` | Host | `role` must be `moderator` or `participant` |
| `remove_participant` | client to server | `{ userId }` | Host | Kicks the user; they receive `removed_from_room` |
| `chat_message` | client to server | `{ text }` | any member | 1 to 300 characters, rate limited; server adds name and role |
| `reaction` | client to server | `{ type }` | any member | `type` must be on the server's whitelist; rate limited |
| `user_joined`, `user_left` | server to clients | `{ username, userId, (role), participants }` | server | Keeps lists in sync |
| `role_assigned` | server to clients | `{ userId, username, role, participants }` | server | Also used for automatic host succession |
| `participant_removed` | server to clients | `{ userId, username, participants }` | server | To everyone still in the room |
| `removed_from_room` | server to one client | `{ roomId }` | server | Sent only to the removed user |
| `chat_message`, `reaction` | server to clients | message / reaction object | server | Broadcast to the whole room |

## Roles and permissions

| Action | Host | Moderator | Participant |
|---|---|---|---|
| Play, pause, seek, change video | yes | yes | no |
| Assign roles, remove participants | yes | no | no |
| Chat and react | yes | yes | yes |

- **The backend enforces everything.** The UI hides controls for UX, but hiding a button is not security: anyone can open DevTools or write a script and emit socket events directly. Every handler runs the same gate (`requirePermission` in `socket/handlers.ts`) before it touches any state.
- **The server decides who you are.** The caller's role is looked up from the server's own records (`socket.id` and `socket.data.roomId`). A role or room ID sent in a payload is never trusted.
- `host` cannot be assigned with `assign_role`, so a room always has exactly one Host. There is deliberately no way to hand the Host role to someone else: it never changes while the Host is in the room. Only if the Host leaves does the role pass automatically to the oldest Moderator (otherwise the oldest Participant).
- The Host cannot demote or remove themselves.

## Project structure

```
watch-party/
├── backend/
│   ├── src/
│   │   ├── server.ts            Express + Socket.IO bootstrap, /health
│   │   ├── config.ts            Reads PORT and CLIENT_ORIGIN
│   │   ├── types.ts             Role, PlayState, Participant, RoomState
│   │   ├── permissions.ts       Role -> allowed actions, can()
│   │   ├── rooms/Room.ts        One room: state, participants, role logic
│   │   ├── rooms/RoomManager.ts Map of all rooms
│   │   ├── socket/handlers.ts   All Socket.IO event handlers
│   │   └── utils/               roomCode.ts, youtube.ts
│   ├── test-client.ts           Rooms, roles, kick, leave
│   ├── attack-test.ts           A "malicious participant" using raw socket.emit
│   ├── test-disconnect.ts       Host succession, empty-room deletion
│   └── test-extras.ts           Chat and reactions
└── frontend/
    └── src/
        ├── pages/               Home (landing page), Room (join form)
        ├── components/          YouTubePlayer, PlayerControls, SeekControl, VideoUrlForm,
        │                        ParticipantList, Chat, ReactionBar, ReactionLayer, ...
        ├── hooks/               useRoom (all room events), useConnected
        ├── services/            socket.js (one shared socket), youtubeApi.js
        └── utils/youtube.js     Video ID extraction
```

## Local setup

**Prerequisites:** Node.js 18 or newer and npm.

### 1. Backend

```bash
cd backend
npm install
npm run dev          # http://localhost:3001  (auto-restarts on save)
```

Check it: open `http://localhost:3001/health`; it should return `{"status":"ok"}`.

Production-style run:

```bash
npm run build        # compiles TypeScript into dist/
npm start            # runs node dist/server.js
```

### 2. Frontend

```bash
cd frontend
npm install
echo "VITE_SERVER_URL=http://localhost:3001" > .env
npm run dev          # http://localhost:5173
```

Open `http://localhost:5173`, create a room, then open the invite link in a **second browser window or an incognito window** to join as a Participant.

## Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| Backend | `PORT` | `3001` | Port to listen on. Render injects this; do not set it there |
| Backend | `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed frontend origin(s) for CORS. Exact match, no trailing slash. Several origins can be comma-separated, for example `https://app.vercel.app,http://localhost:5173` |
| Frontend | `https://watch-party-k0xh.onrender.com/` | `http://localhost:3001` | Backend URL the browser connects to. Vite reads it at **build time**, so changing it needs a rebuild or redeploy |

## Testing

The backend ships with Node scripts that use `socket.io-client` and print the server's replies. Start the backend, then from `backend/`:

```bash
npx tsx test-client.ts       # rooms, roles, kick, leave
npx tsx attack-test.ts       # a Participant tries play/pause/seek/change_video: all must be rejected
npx tsx test-disconnect.ts   # host succession and empty-room deletion
npx tsx test-extras.ts       # chat, reactions, host cannot be changed
```

`attack-test.ts` proves that authorization is enforced on the server and not only in the UI. To run a script against a deployed server, change the `URL` constant at its top (`test-extras.ts` also reads a `URL` environment variable).

Video playback itself needs real browsers. Manual checklist (use a normal window, an incognito window and a third browser or profile):

1. Create a room; the creator is Host
2. Join from another window; the participant list updates in both
3. Host plays, pauses, seeks and changes the video; the other windows follow
4. A Participant cannot see or use the controls; in DevTools, `socket.emit("play", {}, console.log)` returns `ok: false` (dev server only)
5. Host promotes a Participant to Moderator; that window gains the controls instantly
6. A Moderator cannot assign roles or remove people
7. Host removes a Participant; that window shows "You were removed" and loses access
8. A late joiner starts at the current position, while playing and while paused
9. Closing a tab updates everyone's list; closing the Host's tab passes the role on
10. Chat and reactions work between two windows

## Deployment

The backend needs a long-lived process for WebSockets, so it runs on **Render**. The static frontend runs on **Vercel**. Deploy the backend first, because the frontend needs its URL.

### Backend on Render (Web Service)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |
| Env var `CLIENT_ORIGIN` | https://watch-party-seven-jade.vercel.app/ |
| Env var `NODE_VERSION` | optional; match your local Node major version |

`--include=dev` is needed because TypeScript is a devDependency and Render may set `NODE_ENV=production`.

### Frontend on Vercel

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command / output | `npm run build` / `dist` |
| Env var `VITE_SERVER_URL` | your Render URL, with `https://` and no trailing slash |

`frontend/vercel.json` rewrites every path to `index.html`, so refreshing an invite link such as `/room/ABC123` does not return a 404:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Order of steps

1. Deploy the backend to Render and check `/health`
2. Deploy the frontend to Vercel with `VITE_SERVER_URL` set to the Render URL
3. Copy the Vercel URL into Render's `CLIENT_ORIGIN` (Render redeploys)
4. Test the live site from two devices on different networks

Both platforms serve HTTPS, so Socket.IO connects over `wss://`.

## Security notes

- **Authorization on the server only.** The role is read from server-side records, never from the client. `attack-test.ts` demonstrates that raw socket events from a Participant are rejected.
- **All input is validated** as untrusted: usernames (1 to 20 characters), room codes, video IDs (`^[A-Za-z0-9_-]{11}$`), seek times (finite numbers from 0 to 24 h), roles, chat text (1 to 300 characters) and reactions (server-side whitelist). Malformed payloads or a missing acknowledgement callback cannot crash the server.
- **Room codes** use `crypto.randomInt` and an alphabet without look-alike characters (no `0/O/1/I`); anyone who knows a code can join, so it works like a password.
- **Chat is rendered as plain text** by React, so a message cannot inject HTML.
- **CORS** is restricted to the configured frontend origin(s).
- Chat messages and reactions are rate limited per connection.

## Known limitations

- **Rooms live in server memory.** They are lost when the server restarts or Render's free instance sleeps.
- **Single server instance.** With in-memory rooms, a second instance would have a different set of rooms.
- **A refresh or reconnect creates a new identity** (the user ID is the Socket.IO connection ID), so the person must rejoin and becomes a Participant.
- **Kick is not a ban:** a removed user can rejoin with the code.
- **Rate limiting only covers chat and reactions**; other events are not limited.
- **The video ID format is validated, not its existence.** A made-up 11-character ID loads in the player and shows "This video can't be played". Videos whose owners disabled embedding cannot be played.
- **Chat history is not stored;** a late joiner sees only messages sent after they arrive.
- **Small drift is possible** (typically well under a second) because there is no continuous resynchronization.
- **Browser autoplay rules** can occasionally block a remote play until the user interacts with the page.
- **No volume control** yet; the YouTube controls are hidden so that nobody can scrub locally.

## Future improvements

- Redis adapter (`@socket.io/redis-adapter`) and shared room state for horizontal scaling, plus sticky sessions
- Session tokens or login so identity survives refreshes and reconnects
- Persistent rooms and chat history (database or Redis)
- Rate limiting on every event and a ban list
- Local volume and mute control; fullscreen
- Periodic drift correction
- Automated browser tests (for example Playwright) and unit tests for `Room`
