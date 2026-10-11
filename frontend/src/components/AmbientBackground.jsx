// Party background. Everything is pure CSS animation (no libraries) and sits behind the page.
// While a video is playing, RoomView adds the class "is-playing" to <body>; the CSS then turns
// the party up (faster, taller equalizer, bass pulses). When paused or idle it calms down.
// Values are fixed (not Math.random) so every render looks the same.

const BARS = Array.from({ length: 48 }, (_, i) => ({
  peak: 0.3 + ((i * 37) % 65) / 100,     // how tall the bar gets: 0.30 .. 0.94
  duration: 0.7 + ((i * 53) % 12) / 10,  // seconds per bounce: 0.7 .. 1.8
  delay: -(((i * 29) % 20) / 10),        // negative = start mid-animation, out of step
}));

const BEAMS = [
  { left: "12%", color: "amber", duration: 7, delay: 0 },
  { left: "50%", color: "gold", duration: 9, delay: -3 },
  { left: "86%", color: "sage", duration: 8, delay: -5 },
];

const NOTES = [
  { glyph: "♪", left: "7%", size: 26, duration: 17, delay: 0 },
  { glyph: "♫", left: "24%", size: 34, duration: 21, delay: -6 },
  { glyph: "♩", left: "43%", size: 24, duration: 15, delay: -10 },
  { glyph: "♬", left: "61%", size: 30, duration: 19, delay: -3 },
  { glyph: "♪", left: "77%", size: 28, duration: 23, delay: -13 },
  { glyph: "♫", left: "92%", size: 24, duration: 18, delay: -8 },
];

const SPECKS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 47) % 100}%`,
  size: 3 + ((i * 13) % 5),
  duration: 16 + ((i * 7) % 14),
  delay: -((i * 5) % 24),
  drift: ((i * 19) % 80) - 40,
  tone: i % 3 === 0 ? "sage" : i % 5 === 0 ? "amber" : "",
}));

export default function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="blob blob-amber" />
      <div className="blob blob-sage" />
      <div className="blob blob-olive" />
      <div className="blob blob-grey" />

      {BEAMS.map((b, i) => (
        <div
          key={i}
          className={`beam beam-${b.color}`}
          style={{ left: b.left, "--d": `${b.duration}s`, "--delay": `${b.delay}s` }}
        />
      ))}

      <div className="ring ring-1" />
      <div className="ring ring-2" />

      <div className="pulse" />
      <div className="pulse pulse-2" />

      <div className="eq">
        {BARS.map((b, i) => (
          <span
            key={i}
            style={{ "--peak": b.peak, "--d": `${b.duration}s`, "--delay": `${b.delay}s` }}
          />
        ))}
      </div>

      {NOTES.map((n, i) => (
        <span
          key={i}
          className="note"
          style={{
            left: n.left,
            fontSize: n.size,
            animationDuration: `${n.duration}s`,
            animationDelay: `${n.delay}s`,
          }}
        >
          {n.glyph}
        </span>
      ))}

      {SPECKS.map((s, i) => (
        <span
          key={i}
          className={`speck ${s.tone}`}
          style={{
            left: s.left,
            "--s": `${s.size}px`,
            "--dur": `${s.duration}s`,
            "--delay": `${s.delay}s`,
            "--drift": `${s.drift}px`,
          }}
        />
      ))}
    </div>
  );
}