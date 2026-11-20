import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, ShieldCheck, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

type Props = { update: Update; currentVersion: string; onLater: () => void; onInstall: () => void; error?: string; errorMode?: boolean; };

function parseVersion(value: string) {
  const match = value.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1).map(Number) : null;
}
function buildsBehind(current: string, latest: string): number | null {
  const a = parseVersion(current), b = parseVersion(latest);
  if (!a || !b || a[0] !== b[0] || a[1] !== b[1] || b[2] < a[2]) return null;
  return b[2] - a[2];
}

export default function UpdateDialog({ update, currentVersion, onLater, onInstall, error, errorMode = false }: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const onLaterRef = useRef(onLater);
  const behind = useMemo(() => buildsBehind(currentVersion, update.version), [currentVersion, update.version]);
  const notes = update.body?.trim() ?? "";
  useEffect(() => { onLaterRef.current = onLater; }, [onLater]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onLaterRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);
  return (
    <div className="jayver-dialog-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onLater(); }}>
      <section className="jayver-update-dialog" role="dialog" aria-modal="true" aria-labelledby="jayver-update-title" aria-describedby="jayver-update-description" ref={dialogRef}>
        <div className="jayver-dialog-topline">
          <div className="jayver-dialog-brand">
            <img className="jayver-dialog-brand-mark" src="/brand/jayver-mark.svg" alt="Jayver" />
            <span>JAYVER</span>
            <span className="jayver-dialog-context">SYSTEM UPDATE</span>
          </div>
          <button className="jayver-dialog-close" type="button" aria-label="Close update dialog" onClick={onLater}><X size={16} /></button>
        </div>
        <div className={"jayver-update-visual" + (errorMode ? " is-error" : "")} aria-hidden="true">
          <svg className="jayver-obsidian-shard" viewBox="0 0 180 132" fill="none">
            <path className="shard-body" d="M89 5 142 29 166 76 128 121 61 127 18 91 30 39Z"/>
            <path className="shard-facet shard-facet-a" d="M89 5 92 64 30 39Z"/>
            <path className="shard-facet shard-facet-b" d="M89 5 142 29 92 64Z"/>
            <path className="shard-facet shard-facet-c" d="M142 29 166 76 92 64Z"/>
            <path className="shard-facet shard-facet-d" d="M166 76 128 121 92 64Z"/>
            <path className="shard-facet shard-facet-e" d="M128 121 61 127 92 64Z"/>
            <path className="shard-facet shard-facet-f" d="M61 127 18 91 92 64Z"/>
            <path className="shard-facet shard-facet-g" d="M18 91 30 39 92 64Z"/>
            <path className="shard-edge" d="M89 5 142 29 166 76 128 121 61 127 18 91 30 39Z"/>
            <path className="shard-glint" d="M89 5 142 29 166 76"/>
            <path className="shard-glint shard-glint-low" d="m18 91 43 36 67-6"/>
          </svg>
        </div>
        <div className="jayver-dialog-heading">
          <h2 id="jayver-update-title">{errorMode ? "The update wasn't completed." : "A newer version is ready."}</h2>
          <p id="jayver-update-description">{errorMode ? "Jayver couldn't finish installing this release. Your current installation remains unchanged." : "A signed Jayver release is available. Review the version before installing."}</p>
        </div>
        {errorMode ? <div className="jayver-dialog-error" role="alert">{error}</div> : <>
          <div className="jayver-version-comparison" aria-label={"Installed version " + currentVersion + "; available version " + update.version}>
            <div className="jayver-version-cell"><span>INSTALLED VERSION</span><strong>{currentVersion}</strong></div>
            <span className="jayver-version-divider" aria-hidden="true">→</span>
            <div className="jayver-version-cell is-latest"><span>AVAILABLE VERSION</span><strong>{update.version}</strong></div>
          </div>
          <div className="jayver-update-meta">
            <span className="jayver-signed-note"><ShieldCheck size={14} /> Signed release</span>
            {behind !== null && behind > 0 && <span>{behind} {behind === 1 ? "build" : "builds"} behind</span>}
          </div>
          {notes && <div className={"jayver-release-notes" + (notesOpen ? " is-open" : "")}>
            <button type="button" onClick={() => setNotesOpen(value => !value)} aria-expanded={notesOpen}><span>Release notes</span><ChevronDown size={15} /></button>
            {notesOpen && <p>{notes}</p>}
          </div>}
          <p className="jayver-preservation-note"><Check size={14} /> Your launcher data and settings stay in place.</p>
        </>}
        <div className="jayver-dialog-actions">
          <button className="jayver-button-secondary" type="button" onClick={onLater}><span>{errorMode ? "Close" : "Not now"}</span></button>
          <button className="jayver-button-primary" type="button" onClick={onInstall}><span>{errorMode ? "Try again" : "Install update"}</span>{!errorMode && <ArrowDownToLine size={16} />}</button>
        </div>
      </section>
    </div>
  );
}
