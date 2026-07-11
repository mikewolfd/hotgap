import { useEffect, useState } from "react";
import type { HouseholdAnswers } from "@hotgap/shared";
import Flow from "./flow/Flow.js";
import { ResultPage } from "./result/ResultPage.js";
import type { PayContext } from "./lib/narration.js";
import { Landing } from "./pages/Landing.js";
import { PlacesStub } from "./pages/PlacesStub.js";

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

  let page: JSX.Element;
  if (route.startsWith("#/check")) {
    page = result ? (
      <ResultPage answers={result.answers} ctx={result.ctx} onStartOver={() => setResult(null)} />
    ) : (
      <Flow onComplete={(answers, ctx) => setResult({ answers, ctx })} />
    );
  } else if (route.startsWith("#/places")) {
    page = <PlacesStub />;
  } else {
    page = <Landing />;
  }
  return <main className="shell">{page}</main>;
}
