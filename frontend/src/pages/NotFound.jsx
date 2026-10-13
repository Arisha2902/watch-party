import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../home.css";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found | WatchParty";
  }, []);

  return (
    <div className="lp notfound">
      <main className="nf-card panel">
        <p className="kicker mono">Error 404</p>
        <h1>This page doesn't exist</h1>
        <p className="sub">
          The link may be broken or the room code mistyped. Rooms also disappear once everyone leaves.
        </p>
        <div className="nf-actions">
          <Link className="btn btn-primary" to="/">Back to home</Link>
          <a className="btn btn-ghost" href="/#how">How it works</a>
        </div>
      </main>
    </div>
  );
}