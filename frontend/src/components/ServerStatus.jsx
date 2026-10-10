export default function ServerStatus({ connected }) {
  if (connected) return null;
  return (
    <p className="notice">
      Connecting to the server… the first connection can take up to a minute while it wakes up.
    </p>
  );
}