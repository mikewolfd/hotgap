import { t } from "../strings/t.js";

export function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <p className="brand">{t("site.title")}</p>
        <h1>{t("site.tagline")}</h1>
      </header>
      <nav className="doors">
        <a className="door door-check" href="#/check">
          <h2>{t("landing.check.title")}</h2>
          <p>{t("landing.check.body")}</p>
          <span className="door-cta">{t("landing.check.cta")} →</span>
        </a>
        <a className="door door-places" href="#/places">
          <h2>{t("landing.places.title")}</h2>
          <p>{t("landing.places.body")}</p>
        </a>
      </nav>
      <footer className="landing-foot">
        <p>{t("landing.privacy")}</p>
      </footer>
    </div>
  );
}
