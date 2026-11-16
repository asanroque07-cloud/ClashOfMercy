import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const PROFILE_COLUMNS = "user_id, username, display_name, avatar_id";

function getErrorMessage(error) {
  return error?.message || "The cloud account request failed.";
}

function toFriend(profile, request) {
  return {
    id: request.id,
    userId: profile.user_id,
    username: profile.username,
    name: profile.display_name || profile.username,
    avatarId: profile.avatar_id || "avatar_default",
    level: 1,
    rankName: "Recruit",
    rankTier: 1,
    role: "Core",
    status: "unknown",
    isBot: false,
  };
}

export function useCloudAccount() {
  const [user, setUser] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [presenceReady, setPresenceReady] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshFriends = useCallback(async () => {
    if (!supabase || !user) {
      setFriends([]);
      setIncomingRequests([]);
      setPlayerProfile(null);
      return;
    }

    const [profileResult, friendResult, requestResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("friend_requests")
        .select("id, from_user, to_user")
        .eq("status", "accepted")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`),
      supabase
        .from("friend_requests")
        .select("id, from_user, to_user")
        .eq("to_user", user.id)
        .eq("status", "pending"),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (friendResult.error) throw friendResult.error;
    if (requestResult.error) throw requestResult.error;
    setPlayerProfile(profileResult.data);

    const friendRows = friendResult.data || [];
    const requestRows = requestResult.data || [];
    const profileIds = [
      ...new Set([
        ...friendRows.map((row) =>
          row.from_user === user.id ? row.to_user : row.from_user,
        ),
        ...requestRows.map((row) => row.from_user),
      ]),
    ];

    if (profileIds.length === 0) {
      setFriends([]);
      setIncomingRequests([]);
      return;
    }

    const profilesResult = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("user_id", profileIds);
    if (profilesResult.error) throw profilesResult.error;

    const profiles = new Map(
      (profilesResult.data || []).map((profile) => [profile.user_id, profile]),
    );
    setFriends(
      friendRows
        .map((row) => {
          const friendId =
            row.from_user === user.id ? row.to_user : row.from_user;
          const profile = profiles.get(friendId);
          return profile ? toFriend(profile, row) : null;
        })
        .filter(Boolean),
    );
    setIncomingRequests(
      requestRows
        .map((row) => {
          const profile = profiles.get(row.from_user);
          return profile
            ? {
                id: row.id,
                ...toFriend(profile, row),
              }
            : null;
        })
        .filter(Boolean),
    );
  }, [user]);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(getErrorMessage(sessionError));
      setUser(data.session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setError("");
      setUser(session?.user || null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setFriends([]);
      setIncomingRequests([]);
      setPlayerProfile(null);
      return undefined;
    }

    let active = true;
    const refresh = () =>
      refreshFriends().catch((refreshError) => {
        if (active) setError(getErrorMessage(refreshError));
      });

    refresh();
    const channel = supabase
      .channel(`friend-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        refresh,
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refreshFriends, user]);

  useEffect(() => {
    if (!supabase || !user) {
      setOnlineUserIds([]);
      setPresenceReady(false);
      return undefined;
    }

    let active = true;
    setOnlineUserIds([]);
    setPresenceReady(false);

    const channel = supabase.channel("online-players", {
      config: { presence: { key: user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      if (!active) return;
      setOnlineUserIds(Object.keys(channel.presenceState()));
      setPresenceReady(true);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { error: trackError } = await channel.track({ status: "online" });
        if (trackError && active) setError(getErrorMessage(trackError));
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (active) {
          setPresenceReady(false);
          setError("Could not connect to online friend presence.");
        }
      }
    });

    return () => {
      active = false;
      setOnlineUserIds([]);
      setPresenceReady(false);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Google remembers the last account used in a browser, so a plain sign-in
  // silently reuses it. Asking for the account chooser every time means a
  // player can log in with any existing Google account they own.
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError("Cloud accounts are not configured. Add the Supabase project URL and publishable key first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (authError) setError(getErrorMessage(authError));
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }, []);

  const connectGoogle = signInWithGoogle;

  // Switch accounts: the stored session is cleared first so the chooser really
  // appears instead of signing the current player straight back in.
  const switchAccount = useCallback(async () => {
    if (!supabase) {
      setError("Cloud accounts are not configured. Add the Supabase project URL and publishable key first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(getErrorMessage(signOutError));
        setBusy(false);
        return;
      }
    } catch (signOutError) {
      setError(getErrorMessage(signOutError));
      setBusy(false);
      return;
    }
    setBusy(false);

    await signInWithGoogle();
  }, [signInWithGoogle]);

  const disconnectGoogle = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) setError(getErrorMessage(authError));
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }, []);

  const findPlayer = useCallback(async (searchTerm) => {
    if (!supabase || !user) {
      throw new Error("Connect a Google account before finding players.");
    }

    const normalizedSearchTerm = searchTerm.trim();
    if (!normalizedSearchTerm) {
      throw new Error("Enter a display name, username, or user ID to search.");
    }
    if (normalizedSearchTerm.length > 80) {
      throw new Error("Search terms must be 80 characters or fewer.");
    }

    const escapedSearchTerm = normalizedSearchTerm.replace(/[\\%_]/g, "\\$&");
    const isUserId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        normalizedSearchTerm,
      );
    const [displayNameResult, usernameResult, userIdResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .ilike("display_name", `%${escapedSearchTerm}%`)
        .limit(10),
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .ilike("username", `%${escapedSearchTerm}%`)
        .limit(10),
      isUserId
        ? supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .eq("user_id", normalizedSearchTerm)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (displayNameResult.error) throw displayNameResult.error;
    if (usernameResult.error) throw usernameResult.error;
    if (userIdResult.error) throw userIdResult.error;

    const profiles = new Map(
      [
        ...(displayNameResult.data || []),
        ...(usernameResult.data || []),
        ...(userIdResult.data ? [userIdResult.data] : []),
      ]
        .filter((profile) => profile.user_id !== user.id)
        .map((profile) => [profile.user_id, profile]),
    );

    return [...profiles.values()].map((profile) => ({
      id: profile.user_id,
      username: profile.username,
      name: profile.display_name || profile.username,
      avatarId: profile.avatar_id || "avatar_default",
    }));
  }, [user]);

  const sendFriendRequest = useCallback(async (playerId) => {
    if (!supabase || !user) {
      throw new Error("Connect a Google account before adding friends.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("friend_requests")
      .select("id, from_user, to_user, status")
      .or(
        `and(from_user.eq.${user.id},to_user.eq.${playerId}),and(from_user.eq.${playerId},to_user.eq.${user.id})`,
      );
    if (existingError) throw existingError;

    if (existing?.some((request) => request.status === "accepted")) {
      throw new Error("You are already friends.");
    }
    if (existing?.some((request) => request.status === "pending")) {
      throw new Error("A friend request is already pending.");
    }

    const { error: insertError } = await supabase
      .from("friend_requests")
      .insert({ from_user: user.id, to_user: playerId });
    if (insertError) throw insertError;
    await refreshFriends();
  }, [refreshFriends, user]);

  const acceptFriendRequest = useCallback(async (requestId) => {
    if (!supabase || !user) return;
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .eq("to_user", user.id)
      .eq("status", "pending");
    if (updateError) throw updateError;
    await refreshFriends();
  }, [refreshFriends, user]);

  const removeFriend = useCallback(async (requestId) => {
    if (!supabase || !user) return;
    const { error: deleteError } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);
    if (deleteError) throw deleteError;
    await refreshFriends();
  }, [refreshFriends, user]);

  return {
    configured: isSupabaseConfigured,
    user,
    friends: friends.map((friend) => ({
      ...friend,
      status: presenceReady
        ? onlineUserIds.includes(friend.userId)
          ? "online"
          : "offline"
        : "unknown",
    })),
    incomingRequests,
    playerProfile,
    busy,
    error,
    setError,
    connectGoogle,
    switchAccount,
    disconnectGoogle,
    findPlayer,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
  };
}
