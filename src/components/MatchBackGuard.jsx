// While a match is running Android's back button must not drop the player out
// of the game while the canvas keeps running underneath. Ask first, then leave
// the match for the lobby.
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { installBackButtonHandler } from "@/lib/nativeShell";

export default function MatchBackGuard({ onLeave }) {
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    confirmingRef.current = confirming;
  }, [confirming]);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(
    () =>
      installBackButtonHandler(() => {
        // A second back press while the prompt is open just closes it.
        if (confirmingRef.current) setConfirming(false);
        else setConfirming(true);
        return true;
      }),
    [],
  );

  return (
    <ConfirmDialog
      open={confirming}
      title="Leave match"
      message="Do you want to leave this match and return to HQ?"
      confirmLabel="LEAVE MATCH"
      cancelLabel="KEEP PLAYING"
      onCancel={() => setConfirming(false)}
      onConfirm={() => {
        setConfirming(false);
        onLeaveRef.current?.();
      }}
    />
  );
}
