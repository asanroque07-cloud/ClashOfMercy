import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Crosshair,
  Gamepad2,
  Smartphone,
  Users,
  X,
} from "lucide-react";

const SHOWCASE = [
  { src: "/showcase/home.jpg", label: "Command HQ", alt: "Clash Of Mercy home lobby" },
  { src: "/showcase/classic-lobby.jpg", label: "Classic squad", alt: "Classic squad lobby" },
  { src: "/showcase/rank-lobby.jpg", label: "Ranked operations", alt: "Ranked squad lobby" },
  { src: "/showcase/custom-lobby.jpg", label: "Custom battles", alt: "Custom match lobby" },
  { src: "/showcase/battle.jpg", label: "Live combat", alt: "Clash Of Mercy mobile battle" },
  { src: "/showcase/victory.jpg", label: "Match results", alt: "Clash Of Mercy match results" },
];

function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function DownloadPage({ onPlay }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstallHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setInstallError("");
    if (!installPrompt) {
      setShowInstallHelp((open) => !open);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
    } catch {
      setInstallError(
        "The install prompt could not be opened. Use your browser menu to add the game to your home screen.",
      );
    } finally {
      setInstallPrompt(null);
    }
  };

  const installLabel = isInstalled
    ? "Open Clash Of Mercy"
    : installPrompt
      ? "Install the app"
      : isAppleMobile()
        ? "Add to Home Screen"
        : "Install on your phone";

  return (
    <main className="download-landing">
      <header className="download-header">
        <a className="download-brand" href="/" aria-label="Clash Of Mercy">
          <img src="/icon.png" alt="" />
          <span>CLASH OF MERCY</span>
        </a>
        <a className="download-header__play" href="#install">
          PLAY ON MOBILE <ArrowRight size={15} />
        </a>
      </header>

      <section className="download-hero">
        <div className="download-hero__copy">
          <div className="download-eyebrow">
            <span className="download-live-dot" />
            TACTICAL MULTIPLAYER WARFARE
          </div>
          <h1>
            YOUR SQUAD.
            <br />
            YOUR <span>FIGHT.</span>
          </h1>
          <p>
            Join the battle in Clash Of Mercy, a tactical shooter made for
            landscape play on your phone. Build a squad, choose your role, and
            take the fight into classic, ranked, custom, or offline matches.
          </p>
          <div className="download-hero__actions" id="install">
            <button
              type="button"
              className="download-button download-button--primary"
              onClick={isInstalled ? onPlay : handleInstall}
            >
              {isInstalled ? (
                <Gamepad2 size={18} />
              ) : (
                <ArrowDownToLine size={18} />
              )}
              {installLabel}
            </button>
            <button
              type="button"
              className="download-button download-button--secondary"
              onClick={onPlay}
            >
              Play in browser
            </button>
          </div>
          <div className="download-compatibility">
            <Smartphone size={15} />
            Install on Android with Chrome or iPhone/iPad with Safari.
          </div>
          {showInstallHelp && (
            <div className="download-install-help" role="status">
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setShowInstallHelp(false)}
              >
                <X size={15} />
              </button>
              {isAppleMobile()
                ? "In Safari, tap Share, then choose Add to Home Screen."
                : "Open this page in Chrome on Android, tap the menu, then choose Install app or Add to Home screen."}
            </div>
          )}
          {installError && (
            <div className="download-install-help" role="alert">
              {installError}
            </div>
          )}
        </div>
        <div className="download-hero__art">
          <img
            src="/showcase/home.jpg"
            alt="Clash Of Mercy command lobby"
            fetchPriority="high"
          />
          <div className="download-hero__caption">
            <span>DEPLOYMENT READY</span>
            <span>LANDSCAPE MOBILE</span>
          </div>
        </div>
      </section>

      <section className="download-features" aria-label="Game features">
        <article>
          <Crosshair size={20} />
          <div>
            <h2>Built for touch</h2>
            <p>Dual-stick controls you can place and resize.</p>
          </div>
        </article>
        <article>
          <Users size={20} />
          <div>
            <h2>Squad up</h2>
            <p>Build your fireteam and bring friends into the fight.</p>
          </div>
        </article>
        <article>
          <Gamepad2 size={20} />
          <div>
            <h2>Choose your mission</h2>
            <p>Play classic, ranked, custom, and offline battles.</p>
          </div>
        </article>
      </section>

      <section className="download-showcase">
        <div className="download-section-heading">
          <div>
            <div className="download-eyebrow">FIELD REPORT</div>
            <h2>SEE THE BATTLEFIELD</h2>
          </div>
          <span>Clash Of Mercy on mobile</span>
        </div>
        <div className="download-gallery">
          {SHOWCASE.map((shot) => (
            <figure className="download-gallery__item" key={shot.src}>
              <img src={shot.src} alt={shot.alt} loading="lazy" />
              <figcaption>{shot.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="download-footer">
        <img src="/icon.png" alt="" />
        <span>CLASH OF MERCY</span>
        <span>Play in your browser or install on a compatible phone.</span>
      </footer>
    </main>
  );
}
