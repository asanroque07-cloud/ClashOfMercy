import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getErrorMessage(error) {
  return error?.message || "The online match request failed.";
}

async function sendBroadcast(topic, event, payload) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const channel = supabase.channel(topic, {
    config: { broadcast: { ack: true } },
  });
  let timeout;
  try {
    await new Promise((resolve, reject) => {
      timeout = window.setTimeout(
        () => reject(new Error("Timed out connecting to online services.")),
        10000,
      );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          window.clearTimeout(timeout);
          reject(new Error("Could not connect to online services."));
        }
      });
    });

    const result = await channel.send({ type: "broadcast", event, payload });
    if (result !== "ok") {
      throw new Error("The online message could not be delivered.");
    }
  } finally {
    if (timeout) window.clearTimeout(timeout);
    await supabase.removeChannel(channel);
  }
}

export function useOnlineMatch(user, displayName) {
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [room, setRoom] = useState(null);
  const [roomChannel, setRoomChannel] = useState(null);
  const [error, setError] = useState("");
  const roomRef = useRef(null);
  const leaveRoomRef = useRef(null);
  const leavingRoomRef = useRef(null);
  const inviteTeamsRef = useRef(new Map());

  roomRef.current = room;

  useEffect(() => {
    if (!supabase || !user) {
      setIncomingInvites([]);
      return undefined;
    }

    let active = true;
    const channel = supabase
      .channel(`game-invites:${user.id}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        if (!active || payload?.toUserId !== user.id) return;
        setIncomingInvites((invites) =>
          invites.some((invite) => invite.id === payload.id)
            ? invites
            : [...invites, payload],
        );
      })
      .on("broadcast", { event: "cancel" }, ({ payload }) => {
        if (!active || !payload?.roomId) return;
        setIncomingInvites((invites) =>
          invites.filter((invite) => invite.roomId !== payload.roomId),
        );
      })
      .subscribe((status) => {
        if (
          active &&
          (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        ) {
          setError("Could not receive game invitations.");
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user || !room) {
      setRoomChannel(null);
      return undefined;
    }

    let active = true;
    const currentRoom = room;
    const channel = supabase
      .channel(`game-room:${currentRoom.id}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "join" }, ({ payload }) => {
        if (!active || currentRoom.role !== "host") return;
        const assignedTeam =
          inviteTeamsRef.current.get(payload?.userId) || payload?.team || "blue";
        setRoom((previous) => {
          if (!previous || previous.id !== currentRoom.id) return previous;
          const participants = previous.participants || [];
          if (participants.some((player) => player.userId === payload?.userId)) {
            return previous;
          }
          return {
            ...previous,
            participants: [
              ...participants,
              {
                userId: payload.userId,
                name: payload.name,
                team: assignedTeam,
              },
            ],
          };
        });
      })
      .on("broadcast", { event: "leave" }, ({ payload }) => {
        if (!active || currentRoom.role !== "host" || !payload?.userId) return;
        setRoom((previous) =>
          previous?.id === currentRoom.id
            ? {
                ...previous,
                participants: (previous.participants || []).filter(
                  (player) => player.userId !== payload.userId,
                ),
              }
            : previous,
        );
      })
      .on("broadcast", { event: "start" }, ({ payload }) => {
        if (!active || currentRoom.role !== "guest") return;
        setRoom((previous) =>
          previous?.id === currentRoom.id
            ? { ...previous, ...payload, status: "started" }
            : previous,
        );
      })
      .on("broadcast", { event: "end" }, () => {
        if (!active) return;
        setRoom((previous) =>
          previous?.id === currentRoom.id ? null : previous,
        );
      })
      .subscribe(async (status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setRoomChannel(channel);
          setError("");
          if (currentRoom.role === "guest") {
            const joinStatus = await channel.send({
              type: "broadcast",
              event: "join",
              payload: {
                userId: user.id,
                name: displayName || "Player",
                team: currentRoom.team,
              },
            });
            if (
              joinStatus !== "ok" &&
              active
            ) {
              setError("Could not join the match room.");
            }
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRoomChannel(null);
          setError("Could not connect to the match room.");
        }
      });

    return () => {
      active = false;
      setRoomChannel(null);
      supabase.removeChannel(channel);
    };
  }, [room?.id, room?.role, user?.id]);

  const inviteFriend = useCallback(
    async (friend, mode, team = "blue") => {
      if (!supabase || !user) {
        throw new Error("Connect your Google account to invite friends.");
      }

      const friendId = friend.userId || friend.id;
      if (!friendId || friendId === user.id) {
        throw new Error("Choose a valid friend to invite.");
      }

      let activeRoom = roomRef.current;
      if (activeRoom?.role === "guest") {
        throw new Error("Leave your current invitation before creating another.");
      }
      if (
        activeRoom?.role === "host" &&
        (activeRoom.mode !== mode || activeRoom.status === "started")
      ) {
        await leaveRoomRef.current?.();
        activeRoom = null;
      }
      if (inviteTeamsRef.current.has(friendId)) {
        throw new Error("You already invited this friend to the match.");
      }
      if (!activeRoom) {
        activeRoom = {
          id: crypto.randomUUID(),
          role: "host",
          mode,
          status: "inviting",
          hostUserId: user.id,
          hostName: displayName || "Player",
          participants: [
            {
              userId: user.id,
              name: displayName || "Player",
              team: "blue",
            },
          ],
        };
        inviteTeamsRef.current = new Map();
        setRoom(activeRoom);
      }

      if (
        (mode === "classic" || mode === "rank") &&
        inviteTeamsRef.current.size >= 2
      ) {
        throw new Error("This match has room for only two invited teammates.");
      }
      inviteTeamsRef.current.set(friendId, team);
      const invite = {
        id: crypto.randomUUID(),
        roomId: activeRoom.id,
        fromUserId: user.id,
        fromName: activeRoom.hostName,
        toUserId: friendId,
        mode,
        team,
        sentAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      setError("");
      await sendBroadcast(`game-invites:${friendId}`, "invite", invite);
      return invite;
    },
    [displayName, user],
  );

  const acceptInvite = useCallback(
    (invite) => {
      if (!user || invite.toUserId !== user.id) return;
      setIncomingInvites((invites) =>
        invites.filter((item) => item.id !== invite.id),
      );
      if (invite.expiresAt && invite.expiresAt <= Date.now()) {
        setError("That match invitation has expired.");
        return;
      }
      setError("");
      setRoom({
        id: invite.roomId,
        role: "guest",
        mode: invite.mode,
        team: invite.team,
        status: "waiting",
        hostUserId: invite.fromUserId,
        hostName: invite.fromName,
        participants: [],
      });
    },
    [user],
  );

  const declineInvite = useCallback((inviteId) => {
    setIncomingInvites((invites) =>
      invites.filter((item) => item.id !== inviteId),
    );
  }, []);

  const startMatch = useCallback(
    async (matchDetails) => {
      const activeRoom = roomRef.current;
      const channel = roomChannel;
      if (!activeRoom || activeRoom.role !== "host" || !channel) {
        throw new Error("The match room is not connected yet.");
      }

      Array.from(inviteTeamsRef.current.keys()).forEach((userId) => {
        void sendBroadcast(`game-invites:${userId}`, "cancel", {
          roomId: activeRoom.id,
        }).catch((cancelError) => {
          setError(getErrorMessage(cancelError));
        });
      });
      const payload = {
        mode: activeRoom.mode,
        hostUserId: user.id,
        roomId: activeRoom.id,
        ...matchDetails,
      };
      const startStatus = await channel.send({
        type: "broadcast",
        event: "start",
        payload,
      });
      if (startStatus !== "ok") {
        throw new Error("Could not start the online match.");
      }
      setRoom((previous) =>
        previous?.id === activeRoom.id
          ? { ...previous, ...payload, status: "started" }
          : previous,
      );
    },
    [roomChannel, user],
  );

  const leaveRoom = useCallback(async () => {
    const activeRoom = roomRef.current;
    const activeChannel = roomChannel;
    const userId = user?.id;

    if (activeRoom && leavingRoomRef.current === activeRoom.id) return;
    if (activeRoom) leavingRoomRef.current = activeRoom.id;

    if (activeRoom?.role === "host") {
      Array.from(inviteTeamsRef.current.keys()).forEach((invitedUserId) => {
        void sendBroadcast(`game-invites:${invitedUserId}`, "cancel", {
          roomId: activeRoom.id,
        }).catch((cancelError) => {
          setError(getErrorMessage(cancelError));
        });
      });
    }
    inviteTeamsRef.current.clear();

    try {
      if (activeChannel && activeRoom?.role === "guest" && userId) {
        const status = await activeChannel.send({
          type: "broadcast",
          event: "leave",
          payload: { userId },
        });
        if (status !== "ok") {
          setError("Could not notify the host that you left the match.");
        }
      } else if (activeChannel && activeRoom?.role === "host") {
        const status = await activeChannel.send({
          type: "broadcast",
          event: "end",
          payload: { roomId: activeRoom.id },
        });
        if (status !== "ok") {
          setError("Could not notify players that the match ended.");
        }
      }
    } catch (leaveError) {
      setError(getErrorMessage(leaveError));
    } finally {
      if (activeRoom) {
        if (roomRef.current?.id === activeRoom.id) roomRef.current = null;
        setRoom((previous) =>
          previous?.id === activeRoom.id ? null : previous,
        );
        setRoomChannel((previous) =>
          previous === activeChannel ? null : previous,
        );
        if (leavingRoomRef.current === activeRoom.id) {
          leavingRoomRef.current = null;
        }
      } else {
        setRoom(null);
        setRoomChannel(null);
      }
    }
  }, [roomChannel, user?.id]);
  leaveRoomRef.current = leaveRoom;

  return {
    incomingInvites,
    room,
    roomChannel,
    error,
    inviteFriend,
    acceptInvite,
    declineInvite,
    startMatch,
    leaveRoom,
  };
}
