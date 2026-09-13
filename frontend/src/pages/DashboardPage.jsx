import { Link } from "react-router-dom";
import StatCards from "../components/StatCards";
import RiskDistribution from "../components/RiskDistribution";
import DataStatus from "../components/DataStatus";
import HighestRiskPanel from "../components/HighestRiskPanel";
import { useWorkspace } from "../lib/workspace";

/**
 * Operational overview: what is happening, how serious it is, and which
 * event to inspect. Deliberately summary-level — technical depth lives on
 * the Conjunctions, Avoidance and Visualization pages.
 */
export default function DashboardPage() {
  const { dashboard, metadata, health, updatedAt } = useWorkspace();

  return (
    <main className="page">
      <div className="ops-section-head">
        <div>
          <p className="ops-eyebrow">Operations overview</p>
          <h2>Dashboard</h2>
        </div>
        <p className="ops-lede">
          Current conjunction screening picture for the next 24 hours.
        </p>
      </div>

      <HighestRiskPanel event={dashboard.highest_risk} />

      <StatCards dashboard={dashboard} />

      <div className="ops-duo">
        <RiskDistribution dashboard={dashboard} />
        <DataStatus metadata={metadata} health={health} updatedAt={updatedAt} />
      </div>

      <p className="ops-more">
        Full event catalog on the{" "}
        <Link to="/conjunctions">Conjunctions</Link> page.
      </p>
    </main>
  );
}
