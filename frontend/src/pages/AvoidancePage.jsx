import AvoidancePanel from "../components/AvoidancePanel";
import { useWorkspace } from "../lib/workspace";

/**
 * Decision-support page: the recommended action, then the maneuver
 * trade-off ladder. Simulated decision-support — never a flight command.
 */
export default function AvoidancePage() {
  const { avoidance } = useWorkspace();

  return (
    <main className="page">
      <div className="ops-section-head">
        <div>
          <p className="ops-eyebrow">Decision support</p>
          <h2>Avoidance</h2>
        </div>
        <p className="ops-lede">
          Simulated maneuver recommendation for the screened conjunction
          scenario.
        </p>
      </div>

      <AvoidancePanel avoidance={avoidance} />
    </main>
  );
}
