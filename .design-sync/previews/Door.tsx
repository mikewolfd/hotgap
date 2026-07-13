import { Door } from "@hotgap/design-system";

export const TwoDoors = () => (
  <div className="doors">
    <Door
      highlighted
      title="Check my own benefits"
      description="Answer a few questions and see if earning more could leave you with less."
      cta="Start"
    />
    <Door
      title="Compare places"
      description="See which states have the roughest benefits cliffs."
      cta="See the map"
    />
  </div>
);
