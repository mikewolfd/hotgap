import { t } from "../strings/t.js";

export function PlacesStub() {
  return (
    <div className="places-stub">
      <h1>{t("places.title")}</h1>
      <p>{t("places.body")}</p>
      <a className="primary" href="#/">{t("places.back")}</a>
    </div>
  );
}
