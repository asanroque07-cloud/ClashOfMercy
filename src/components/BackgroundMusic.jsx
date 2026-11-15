// BackgroundMusic.jsx plays the game's music and shows a small mute button.
// It switches between the calm lobby theme and the combat theme depending on
// the "combatMode" prop it receives, and remembers whether you muted it.
import { useEffect, useMemo } from "react";

const AUDIO_SRC = "/audio/opwar-theme.m4a"; // this is for the looping theme song file played in the background

// This manages the looping background theme song.
// It also lowers the volume during combat and works around browsers blocking autoplay until the
// player interacts with the page at least once.
export default function BackgroundMusic({
  combatMode = false,
  enabled: musicEnabled = true,
}) {
  const audio = useMemo(() => {
    const instance = new Audio(AUDIO_SRC);
    instance.loop = true;
    instance.preload = "auto";
    return instance;
  }, []);

  useEffect(() => {
    audio.volume = combatMode ? 0.24 : 0.42;
  }, [audio, combatMode]);

  useEffect(() => {
    if (!musicEnabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const attemptPlay = () => {
      void audio.play().catch(() => {
        // Browser autoplay policies may require another interaction.
      });
    };

    attemptPlay();

    const unlockAudio = () => {
      attemptPlay();
      if (!audio.paused) {
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
      }
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [audio, musicEnabled]);

  useEffect(() => {
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  return null;
}
