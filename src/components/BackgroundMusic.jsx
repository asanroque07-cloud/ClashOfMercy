// BackgroundMusic.jsx plays the game's music and shows a small mute button.
// It switches between the calm lobby theme and the combat theme depending on
// the "combatMode" prop it receives, and remembers whether you muted it.
import { useEffect, useMemo, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_KEY = "opwar_music_enabled"; // remembers whether the player muted music, across visits
const AUDIO_SRC = "/audio/opwar-theme.m4a"; // this is for the looping theme song file played in the background

// This renders the floating music on/off button and manages the looping background theme song.
// It also lowers the volume during combat and works around browsers blocking autoplay until the
// player interacts with the page at least once.
export default function BackgroundMusic({ combatMode = false }) {
  const audio = useMemo(() => {
    const instance = new Audio(AUDIO_SRC);
    instance.loop = true;
    instance.preload = "auto";
    return instance;
  }, []);

  const [musicEnabled, setMusicEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audio.volume = combatMode ? 0.24 : 0.42;
  }, [audio, combatMode]);

  useEffect(() => {
    const syncPlayingState = () => setIsPlaying(!audio.paused);
    audio.addEventListener("play", syncPlayingState);
    audio.addEventListener("pause", syncPlayingState);
    audio.addEventListener("ended", syncPlayingState);

    return () => {
      audio.removeEventListener("play", syncPlayingState);
      audio.removeEventListener("pause", syncPlayingState);
      audio.removeEventListener("ended", syncPlayingState);
    };
  }, [audio]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(musicEnabled));
    }

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

  return (
    <button
      type="button"
      onClick={() => setMusicEnabled((prev) => !prev)}
      className="mobile-audio-toggle fixed bottom-4 left-4 z-[220] flex items-center gap-2 rounded border border-military bg-stone-950/85 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-stone-200 shadow-xl transition-all hover:border-[#76a035] hover:text-[#76a035] cursor-pointer"
      aria-pressed={musicEnabled}
      aria-label={
        musicEnabled ? "Turn background music off" : "Turn background music on"
      }
      title={
        musicEnabled ? "Turn background music off" : "Turn background music on"
      }
    >
      {musicEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span>
        {musicEnabled ? (isPlaying ? "Music On" : "Start Music") : "Music Off"}
      </span>
    </button>
  );
}
