import "./StatCards.css";

const CARDS = [
  { key: "total", label: "Total Conjunctions", tone: "neutral" },
  { key: "high", label: "High Risk", tone: "critical" },
  { key: "medium", label: "Medium Risk", tone: "caution" },
  { key: "low", label: "Low Risk", tone: "nominal" },
];

/**
 * Overview KPI row. Values come straight from /api/dashboard.
 */
export default function StatCards({ dashboard }) {
  return (
    <section className="stat-cards" aria-label="Risk overview">
      {CARDS.map((card) => {
        const valueField = `${card.key === "total" ? "total_conjunctions" : `${card.key}_risk`}`;
        return (
          <article key={card.key} className={`stat-card tone-${card.tone}`}>
            <span className="stat-accent" aria-hidden="true" />
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{dashboard[valueField] ?? "—"}</div>
            <div className="stat-caption">24h screening window</div>
          </article>
        );
      })}
    </section>
  );
}
