// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { Landing } from "./Landing.js";
import { t } from "../strings/t.js";

// Scoped to `container` (not the destructured queries, which read
// document.body) since RTL auto-cleanup isn't wired up in this project — same
// note as the other component tests.
describe("Landing", () => {
  it("renders both doors as links to the two routes, with copy from the string table", () => {
    const { container } = render(<Landing />);
    const q = within(container);

    const check = q.getByRole("link", { name: new RegExp(t("landing.check.title"), "i") });
    expect(check.getAttribute("href")).toBe("#/check");
    expect(check.textContent).toContain(t("landing.check.body"));

    const places = q.getByRole("link", { name: new RegExp(t("landing.places.title"), "i") });
    expect(places.getAttribute("href")).toBe("#/places");
    expect(places.textContent).toContain(t("landing.places.body"));

    // Copy is the app's, never a DS default.
    expect(q.getByText(t("landing.privacy"))).toBeTruthy();
  });

  it("marks the check door as the highlighted primary door with a button-style CTA", () => {
    const { container } = render(<Landing />);
    const check = within(container).getByRole("link", { name: new RegExp(t("landing.check.title"), "i") });
    // highlighted -> teal-bordered door-check variant.
    expect(check.className).toContain("door-check");
    // ctaVariant="button" renders the CTA as the teal primary pill.
    const cta = within(check).getByText(t("landing.check.cta"));
    expect(cta.className).toContain("primary");
  });
});
