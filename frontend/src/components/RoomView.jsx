import { useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import ParticipantList from "./ParticipantList";
import YouTubePlayer from "./YouTubePlayer";
import PlayerControls from "./PlayerControls";
import SeekControl from "./SeekControl";
import VideoUrlForm from "./VideoUrlForm";
import CopyLinkButton from "./CopyLinkButton";
import PartyBadge from "./PartyBadge";
import Chat from "./Chat";
import ReactionBar from "./ReactionBar";
import ReactionLayer from "./ReactionLayer";
import "../room.css";

export default function RoomView({ initial }) {
  const {
    participants, videoState, notice, removed, disconnected,
    messages, reactions, myUserId, myRole,
  } = useRoom(initial);

  // hooks must run before any early return
  const playerHandle = useRef(null);
  const getPlayer = useCallback(() => playerHandle.current, []);

  const hasVideo = videoState.videoId !== null;
  const playing = hasVideo && videoState.playState === "playing" && !removed && !disconnected;

  // Tell the CSS whether the party is on. The background listens to this class on <body>.
  useEffect(() => {
    document.body.classList.toggle("is-playing", playing);
    return () => document.body.classList.remove("is-playing");
  }, [playing]);

  if (removed) {
    return (
      <main className="card">
        <h1>You were removed from this room</h1>
        <Link to="/">Back to home</Link>
      </main>
    );
  }

  if (disconnected) {
    return (
      <main className="card">
        <h1>Connection lost</h1>
        <p>You were disconnected from the room. Rejoin to continue.</p>
        <button onClick={() => window.location.assign(`/room/${initial.roomId}`)}>Rejoin</button>
      </main>
    );
  }

  const inviteLink = `${window.location.origin}/room/${initial.roomId}`;
  const canControl = myRole === "host" || myRole === "moderator";

  return (
    <div className="room">
      <header>
        <h2>Room: {initial.roomId}</h2>
        <PartyBadge playing={playing} hasVideo={hasVideo} />
        <CopyLinkButton link={inviteLink} />
        <span>
          You are: <strong>{myRole}</strong>
        </span>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section>
        <div className="stage">
          <YouTubePlayer
            state={videoState}
            onPlayerReady={(p) => { playerHandle.current = p; }}
          />
          <ReactionLayer reactions={reactions} />
        </div>
        <PlayerControls
          playState={videoState.playState}
          hasVideo={hasVideo}
          canControl={canControl}
        />
        <ReactionBar />
        {canControl && hasVideo && <SeekControl getPlayer={getPlayer} />}
        {canControl && <VideoUrlForm />}
      </section>

      <aside>
        <ParticipantList participants={participants} myUserId={myUserId} myRole={myRole} />
        <Chat messages={messages} myUserId={myUserId} />
      </aside>
    </div>
  );
}