import { useEffect, useState } from "react";
import type { HouseholdAnswers } from "@hotgap/shared";
import Flow from "./flow/Flow.js";
import { ResultPage } from "./result/ResultPage.js";
import type { PayContext } from "./lib/narration.js";
import { ensureCountyTable } from "./lib/county.js";
import { Landing } from "./pages/Landing.js";
import { PlacesPage } from "./pages/PlacesPage.js";

function useHashRoute(): string {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(location.hash || "#/");
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const [result, setResult] = useState<{ answers: HouseholdAnswers; ctx: PayContext } | null>(null);

  useEffect(() => { if (!route.startsWith("#/check")) setResult(null); }, [route]);
  // Fire-and-forget: kick off the ZIP->county crosswalk fetch as soon as the
  // app mounts so it's usually ready well before the user reaches the ZIP
  // screen. zipToCounty degrades to null (state-only) if it isn't loaded yet.
  useEffect(() => { ensureCountyTable(); }, []);

  let page: JSX.Element;
  if (route.startsWith("#/check")) {
    page = result ? (
      <ResultPage answers={result.answers} ctx={result.ctx} onStartOver={() => setResult(null)} />
    ) : (
      <Flow onComplete={(answers, ctx) => setResult({ answers, ctx })} />
    );
  } else if (route.startsWith("#/places")) {
    page = <PlacesPage />;
  } else {
    page = <Landing />;
  }
  return <main className="shell">{page}</main>;
}
