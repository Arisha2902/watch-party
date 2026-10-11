// Draws floating emojis over the video. It ignores clicks (pointer-events: none in the CSS),
// so it can never get in the way of the player.

export default function ReactionLayer({ reactions }) {
  return (
    <div className="reaction-layer" aria-hidden="true">
      {reactions.map((r) => (
        <div key={r.id} className="react-float" style={{ left: `${r.left}%` }}>
          <span className="react-emoji">{r.emoji}</span>
          <small>{r.username}</small>
        </div>
      ))}
    </div>
  );
}