import { useEffect, useState } from "react";

/**
 * Live UTC clock, updated once per second. Initialized synchronously so
 * consumers can always call Date methods on the result.
 */
export function useUtcClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function formatClock(date) {
  if (!date) return "--:--:--";
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}`;
}
