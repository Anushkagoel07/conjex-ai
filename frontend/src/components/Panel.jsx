import "./Panel.css";

/**
 * Shared panel shell: eyebrow + title header with an optional right-side
 * tag, and a slot for the panel body.
 */
export default function Panel({
  id,
  eyebrow,
  title,
  tag,
  className = "",
  headerExtra,
  children,
}) {
  return (
    <section id={id} className={`panel ${className}`}>
      <div className="panel-header">
        <div className="panel-title">
          {eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}
          {title && <h3>{title}</h3>}
        </div>
        {headerExtra}
        {typeof tag === "string" ? <span className="panel-tag">{tag}</span> : tag}
      </div>
      {children}
    </section>
  );
}
