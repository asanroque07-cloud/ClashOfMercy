// useProfile is a small custom React hook. A hook is just a reusable function
// (its name starts with "use") that lets a component hold state. This one loads
// the saved player profile once and gives components an easy way to read and
// update it, saving every change back to localStorage automatically.
import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "./storage";
import { DEFAULT_PROFILE } from "./gameTypes";

// this is a React hook that keeps a component's profile state in sync with localStorage,
// re-reading it whenever any part of the app calls saveProfile() (via the "profile:change" event)
export function useProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  useEffect(() => {
    setProfile(loadProfile());
    const onChange = () => setProfile(loadProfile());
    window.addEventListener("profile:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("profile:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const update = (p) => {
    saveProfile(p);
    setProfile(p);
  };
  return [profile, update];
}
