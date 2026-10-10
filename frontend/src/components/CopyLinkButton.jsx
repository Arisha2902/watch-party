import { useState } from "react";

export default function CopyLinkButton({ link }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link); // clipboard blocked: fall back to manual copy
    }
  }

  return <button onClick={copy}>{copied ? "Copied ✓" : "Copy invite link"}</button>;
}