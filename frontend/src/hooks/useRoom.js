import { useEffect, useState } from "react";
import { socket } from "../services/socket";

export function useRoom(initial) {
  const [participants, setParticipants] = useState(initial.participants);
  const [videoState, setVideoState] = useState(initial.state);
  const [notice, setNotice] = useState(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
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

    socket.on("user_joined", onJoined);
    socket.on("user_left", onLeft);
    socket.on("role_assigned", onRole);
    socket.on("participant_removed", onParticipantRemoved);
    socket.on("removed_from_room", onYouWereRemoved);
    socket.on("sync_state", onSync);

    return () => {
      socket.off("user_joined", onJoined);
      socket.off("user_left", onLeft);
      socket.off("role_assigned", onRole);
      socket.off("participant_removed", onParticipantRemoved);
      socket.off("removed_from_room", onYouWereRemoved);
      socket.off("sync_state", onSync);
    };
  }, []);

  const me = participants.find((p) => p.userId === initial.userId);

  return {
    participants,
    videoState,
    notice,
    removed,
    myUserId: initial.userId,
    myRole: me?.role ?? initial.role,
  };
}