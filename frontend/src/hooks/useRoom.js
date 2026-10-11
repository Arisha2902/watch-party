import { useEffect, useState } from "react";
import { socket } from "../services/socket";

const MAX_MESSAGES = 100;       // keep memory bounded in long chats
const REACTION_LIFETIME_MS = 3000;

export function useRoom(initial) {
  const [participants, setParticipants] = useState(initial.participants);
  const [videoState, setVideoState] = useState(initial.state);
  const [notice, setNotice] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);

  // notices fade away after 4 seconds (a new notice restarts the timer)
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    const reactionTimers = [];

    const onJoined = (d) => {
      setParticipants(d.participants);
      setNotice(`${d.username} joined`);
    };
    const onLeft = (d) => {
      setParticipants(d.participants);
      setNotice(`${d.username} left`);
    };
    const onRole = (d) => {
      setParticipants(d.participants);
      setNotice(`${d.username} is now ${d.role}`);
    };
    const onParticipantRemoved = (d) => {
      setParticipants(d.participants);
      setNotice(`${d.username} was removed`);
    };
    const onYouWereRemoved = () => setRemoved(true);
    const onSync = (s) => setVideoState(s);
    const onDisconnect = () => setDisconnected(true);

    const onChat = (message) => {
      setMessages((prev) => [...prev, message].slice(-MAX_MESSAGES));
    };

    const onReaction = (r) => {
      // random horizontal position, chosen once per reaction (fine here: this is an event handler)
      const floating = { ...r, left: 8 + Math.random() * 78 };
      setReactions((prev) => [...prev, floating]);
      reactionTimers.push(
        setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== r.id)), REACTION_LIFETIME_MS)
      );
    };

    socket.on("user_joined", onJoined);
    socket.on("user_left", onLeft);
    socket.on("role_assigned", onRole);
    socket.on("participant_removed", onParticipantRemoved);
    socket.on("removed_from_room", onYouWereRemoved);
    socket.on("sync_state", onSync);
    socket.on("disconnect", onDisconnect);
    socket.on("chat_message", onChat);
    socket.on("reaction", onReaction);

    return () => {
      reactionTimers.forEach(clearTimeout);
      socket.off("user_joined", onJoined);
      socket.off("user_left", onLeft);
      socket.off("role_assigned", onRole);
      socket.off("participant_removed", onParticipantRemoved);
      socket.off("removed_from_room", onYouWereRemoved);
      socket.off("sync_state", onSync);
      socket.off("disconnect", onDisconnect);
      socket.off("chat_message", onChat);
      socket.off("reaction", onReaction);
    };
  }, []);

  // Role comes from the SERVER's participant list, so promotions update the UI instantly
  const me = participants.find((p) => p.userId === initial.userId);

  return {
    participants,
    videoState,
    notice,
    removed,
    disconnected,
    messages,
    reactions,
    myUserId: initial.userId,
    myRole: me?.role ?? initial.role,
  };
}