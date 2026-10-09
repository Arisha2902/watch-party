import { Link } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import ParticipantList from "./ParticipantList";
import YouTubePlayer from "./YouTubePlayer";
import PlayerControls from "./PlayerControls";

export default function RoomView({ initial }) {
  const { participants, videoState, notice, removed, myUserId, myRole } = useRoom(initial);

  if (removed) {
    return (
      <main className="card">
        <h1>You were removed from this room</h1>
        <Link to="/">Back to home</Link>
      </main>
    );
  }

  const inviteLink = `${window.location.origin}/room/${initial.roomId}`;
  const canControl = myRole === "host" || myRole === "moderator";

  return (
    <div className="room">
      <header>
        <h2>Room: {initial.roomId}</h2>
        <button onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy invite link</button>
        <span>
          You are: <strong>{myRole}</strong>
        </span>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section>
        <YouTubePlayer state={videoState} />
        <PlayerControls
          playState={videoState.playState}
          hasVideo={videoState.videoId !== null}
          canControl={canControl}
        />
        <pre className="muted">{JSON.stringify(videoState)}</pre>
      </section>

      <aside>
        <ParticipantList participants={participants} myUserId={myUserId} />
      </aside>
    </div>
  );
}