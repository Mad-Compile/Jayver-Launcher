import { useEffect, useRef } from "react";

type Props = { progress: number; ready: boolean; onWhiteoutComplete: () => void };

export default function UpdateReactor({ progress, ready, onWhiteoutComplete }: Props) {
  const callback = useRef(onWhiteoutComplete);
  callback.current = onWhiteoutComplete;

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => callback.current(), 1550);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  const label = ready ? "Preparing installation" : progress > 0 ? "Downloading your update…" : "Configuring your update…";

  return (
    <div className="update-reactor update-minimal" role="status" aria-live="polite">
      <div className={`update-orbit${ready ? " is-ready" : ""}`} aria-hidden="true">
        <span className="update-orbit-track" />
        <span className="update-orbit-highlight" />
        <span className="update-orbit-core" />
      </div>
      <div className="update-minimal-copy">
        <strong>{label}</strong>
        <span>{ready ? "Your signed package is verified" : progress > 0 ? `${Math.round(progress)}% · Secure download` : "Please wait while Jayver gets everything ready"}</span>
      </div>
      <div className="update-minimal-brand">JAYVER <i /> MAD COMPILE</div>
    </div>
  );
}
