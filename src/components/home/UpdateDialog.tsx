import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, ShieldCheck, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

type Props = {
  update: Update;
  currentVersion: string;
  onLater: () => void;
  onInstall: () => void;
  error?: string;
  errorMode?: boolean;
};

function parseVersion(value: string) {
  const match = value.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1).map(Number) : null;
}

function buildsBehind(current: string, latest: string): number | null {
  const a = parseVersion(current), b = parseVersion(latest);
  if (!a || !b || a[0] !== b[0] || a[1] !== b[1] || b[2] < a[2]) return null;
  return b[2] - a[2];
}

export default function UpdateDialog({ update, currentVersion, onLater, onInstall, error, errorMode=false }: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const behind = useMemo(() => buildsBehind(currentVersion, update.version), [currentVersion, update.version]);
  const notes = update.body?.trim() ?? "";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button");
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onLater();
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'));
      if (!items.length) return;
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [onLater]);

  return (
    <div className="jayver-dialog-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onLater(); }}>
      <section className="jayver-update-dialog" role="dialog" aria-modal="true" aria-labelledby="jayver-update-title" aria-describedby="jayver-update-description" ref={dialogRef}>
        <div className="jayver-dialog-topline">
          <div className="jayver-dialog-brand"><span className="jayver-dialog-mark">J</span><span>JAYVER</span><i/> <span className="jayver-dialog-context">SOFTWARE UPDATE</span></div>
          <button className="jayver-dialog-close" type="button" aria-label="Close update dialog" onClick={onLater}><X size={15}/></button>
        </div>
        <div className="jayver-dialog-heading">
          <div className="jayver-dialog-symbol" aria-hidden="true">{errorMode ? <X size={19}/> : <ArrowDownToLine size={19}/>}</div>
          <div>
            <h2 id="jayver-update-title">{errorMode ? "Update couldn't complete." : "A newer version is ready."}</h2>
            <p id="jayver-update-description">{errorMode ? "Jayver couldn't finish preparing this update. Your current installation has not been replaced." : "Review the version details before updating your launcher."}</p>
          </div>
        </div>
        {errorMode ? (
          <div className="jayver-dialog-error" role="alert">{error}</div>
        ) : (
          <>
            <div className="jayver-version-comparison">
              <div className="jayver-version-cell"><span>INSTALLED VERSION</span><strong>{currentVersion}</strong></div>
              <div className="jayver-version-divider"><span>→</span></div>
              <div className="jayver-version-cell is-latest"><span>AVAILABLE VERSION</span><strong>{update.version}</strong></div>
            </div>
            <div className="jayver-update-meta">
              <span>{behind === null ? "Version comparison" : behind === 0 ? "Latest build" : `${behind} ${behind === 1 ? "build" : "builds"} behind`}</span>
              <span className="jayver-signed-note"><ShieldCheck size={13}/> Signed release</span>
            </div>
            {notes && <div className={`jayver-release-notes${notesOpen ? " is-open" : ""}`}>
              <button type="button" onClick={() => setNotesOpen(value => !value)} aria-expanded={notesOpen}>Release notes <ChevronDown size={14}/></button>
              {notesOpen && <p>{notes}</p>}
            </div>}
            <p className="jayver-preservation-note"><Check size={14}/> Your launcher data and settings stay in place.</p>
          </>
        )}
        <div className="jayver-dialog-actions">
          <button className="jayver-button-secondary" type="button" onClick={onLater}>{errorMode ? "Close" : "Later"}</button>
          <button className="jayver-button-primary" type="button" onClick={onInstall}>{errorMode ? "Review update" : "Install update"}{!errorMode && <ArrowDownToLine size={15}/>}</button>
        </div>
        <div className="jayver-dialog-footer"><span>© MAD COMPILE</span><span>JAYVER LAUNCHER</span></div>
      </section>
    </div>
  );
}
