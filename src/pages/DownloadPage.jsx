import { useState } from "react";
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

// The Android build ships as a real APK, so the install button hands the phone
// that file: the browser downloads it and Android's package installer takes
// over. iPhones/iPads can't install APKs, so they get Safari's Add to Home
// Screen steps instead.
const APK_HREF = "/download/clash-of-mercy.apk";
const APK_FILENAME = "ClashOfMercy.apk";

export default function DownloadPage({ onPlay }) {
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const appleDevice = isAppleMobile();

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
            {appleDevice ? (
              <button
                type="button"
                className="download-button download-button--primary"
                onClick={() => setShowInstallHelp((open) => !open)}
              >
                <ArrowDownToLine size={18} />
                Add to Home Screen
              </button>
            ) : (
              <a
                className="download-button download-button--primary"
                href={APK_HREF}
                download={APK_FILENAME}
              >
                <ArrowDownToLine size={18} />
                Install the app
              </a>
            )}
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
            Android: downloads the Clash Of Mercy APK, then allow installs from
            this source. iPhone/iPad: Add to Home Screen from Safari.
          </div>
          {showInstallHelp && appleDevice && (
            <div className="download-install-help" role="status">
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setShowInstallHelp(false)}
              >
                <X size={15} />
              </button>
              In Safari, tap Share, then choose Add to Home Screen.
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
