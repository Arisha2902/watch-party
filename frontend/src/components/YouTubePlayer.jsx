import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "../services/youtubeApi";

const DRIFT_TOLERANCE_SECONDS = 0.5;

function applyState(player, loadedVideoId, s) {
  if (!s.videoId) return;

  if (loadedVideoId.current !== s.videoId) {
    loadedVideoId.current = s.videoId;
    const args = { videoId: s.videoId, startSeconds: s.currentTime };
    if (s.playState === "playing") player.loadVideoById(args);
    else player.cueVideoById(args);
    return;
  }

  if (Math.abs(player.getCurrentTime() - s.currentTime) > DRIFT_TOLERANCE_SECONDS) {
    player.seekTo(s.currentTime, true);
  }
  if (s.playState === "playing") player.playVideo();
  else player.pauseVideo();
}

export default function YouTubePlayer({ state, onPlayerReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const loadedVideoIdRef = useRef(null);
  const latestStateRef = useRef(state);
  const [playerError, setPlayerError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      const target = document.createElement("div");
      container.appendChild(target);

      playerRef.current = new window.YT.Player(target, {
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            onPlayerReady?.(e.target);
            applyState(e.target, loadedVideoIdRef, latestStateRef.current);
          },
          onError: () => setPlayerError("This video can't be played (embedding may be disabled)."),
        },
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      loadedVideoIdRef.current = null;
      onPlayerReady?.(null);
      playerRef.current?.destroy();
      playerRef.current = null;
      container.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    latestStateRef.current = state;
    if (playerRef.current && readyRef.current) {
      applyState(playerRef.current, loadedVideoIdRef, state);
    }
  }, [state]);

  useEffect(() => {
    setPlayerError(null);
  }, [state.videoId]);

  return (
    <div className="player-wrap">
      <div ref={containerRef} className="player-container" />
      <div className="player-shield" />
      {!state.videoId && (
        <div className="player-message">Waiting for the host to choose a video…</div>
      )}
      {playerError && <div className="player-message">{playerError}</div>}
    </div>
  );
}