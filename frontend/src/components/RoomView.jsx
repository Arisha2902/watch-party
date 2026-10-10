// import { Link } from "react-router-dom";
// import { useRoom } from "../hooks/useRoom";
// import ParticipantList from "./ParticipantList";
// import YouTubePlayer from "./YouTubePlayer";
// import PlayerControls from "./PlayerControls";
// import { useRef, useCallback } from "react";
// import SeekControl from "./SeekControl";
// import VideoUrlForm from "./VideoUrlForm";


// export default function RoomView({ initial }) {
//   const { participants, videoState, notice, removed, myUserId, myRole } = useRoom(initial);
//   const playerHandle = useRef(null);
//   const getPlayer = useCallback(() => playerHandle.current, []);
  

  
//   if (removed) {
//     return (
//       <main className="card">
//         <h1>You were removed from this room</h1>
//         <Link to="/">Back to home</Link>
//       </main>
//     );
//   }

//   const inviteLink = `${window.location.origin}/room/${initial.roomId}`;
//   const canControl = myRole === "host" || myRole === "moderator";
//   {canControl && <VideoUrlForm />}

//   return (
//     <div className="room">
//       <header>
//         <h2>Room: {initial.roomId}</h2>
//         <button onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy invite link</button>
//         <span>  
//           You are: <strong>{myRole}</strong>
//         </span>
//       </header>

//       {notice && <p className="notice">{notice}</p>}

//       <section>
//         {/* <YouTubePlayer state={videoState} /> */}
//         <YouTubePlayer state={videoState} onPlayerReady={(p) => { playerHandle.current = p; }} />

//         <PlayerControls
//           playState={videoState.playState}
//           hasVideo={videoState.videoId !== null}
//           canControl={canControl}
//         />
//         <pre className="muted">{JSON.stringify(videoState)}</pre>
//       </section>

//       <aside>
//         <ParticipantList participants={participants} myUserId={myUserId} myRole={myRole}/>
//       </aside>
//     </div>
//   );
// }



import { useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import ParticipantList from "./ParticipantList";
import YouTubePlayer from "./YouTubePlayer";
import PlayerControls from "./PlayerControls";
import SeekControl from "./SeekControl";
import VideoUrlForm from "./VideoUrlForm";

export default function RoomView({ initial }) {
  const { participants, videoState, notice, removed, disconnected, myUserId, myRole } =
    useRoom(initial);

  // hooks must run before any early return
  const playerHandle = useRef(null);
  const getPlayer = useCallback(() => playerHandle.current, []);

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
  const hasVideo = videoState.videoId !== null;

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
        <YouTubePlayer
          state={videoState}
          onPlayerReady={(p) => { playerHandle.current = p; }}
        />
        <PlayerControls
          playState={videoState.playState}
          hasVideo={hasVideo}
          canControl={canControl}
        />
        {canControl && hasVideo && <SeekControl getPlayer={getPlayer} />}
        {canControl && <VideoUrlForm />}
      </section>

      <aside>
        <ParticipantList participants={participants} myUserId={myUserId} myRole={myRole} />
      </aside>
    </div>
  );
}