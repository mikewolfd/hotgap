import { Door } from "@hotgap/design-system";
import { t } from "../strings/t.js";

export function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <p className="brand">{t("site.title")}</p>
        <h1>{t("site.tagline")}</h1>
      </header>
      <nav className="doors">
        <Door
          title={t("landing.check.title")}
          description={t("landing.check.body")}
          cta={t("landing.check.cta")}
          ctaVariant="button"
          highlighted
          href="#/check"
        />
        <Door
          title={t("landing.places.title")}
          description={t("landing.places.body")}
          cta={t("landing.check.cta")}
          href="#/places"
        />
      </nav>
      <footer className="landing-foot">
        <p>{t("landing.privacy")}</p>
      </footer>
    </div>
  );
}
