# Jayver interface quality rules

Jayver's interface is intentionally authored, not assembled from generic dashboard conventions.

## Brand invariants
- Monochrome only: black, charcoal, graphite, silver, grey and white.
- No gold, champagne, copper, amber, RGB, neon or coloured accent states in brand UI.
- The approved standalone J mark is the only logo on the startup screen. Do not add the JAYVER wordmark there.
- Copyright credit: `© Mad Compile`, bottom-right, in a standard system sans-serif.
- Motion may be technically rich; visual restraint does not mean static design.

## Typography
- Use the platform/system sans-serif stack for interface copy: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif.
- No novelty, sci-fi, futuristic, pseudo-terminal or decorative fonts.
- Do not use monospace for decorative micro-labels.
- Use tabular numerals only for changing/aligned measurements.
- Avoid excessive tracking, repeated all-caps eyebrow labels, oversized bold headings, fake editorial serif accents and arbitrary font pairings.
- A typeface is not inherently "AI slop"; evaluate its role, legibility, licensing, script coverage and actual rendered use.

## Anti-slop design gate
Reject:
- Generic hero + card grid + statistics + testimonials + CTA templates when they do not fit the task.
- Decorative blobs, gratuitous gradients, glows, fake grids, unnecessary glass cards and random 3D objects.
- Repeated pills, rounded cards and nested outlines without functional grouping.
- Fake telemetry, invented progress, fake success states or vague pseudo-technical labels.
- Text that could be pasted into any unrelated app.
- Motion that distracts, obscures status, blocks interaction, ignores reduced-motion preferences or wastes GPU resources.
- Inaccessible contrast, missing focus, clipped content, broken fallbacks or untested claims.

## Startup loader
- WebGL particles are atmospheric brand motion, not a substitute for clear system status.
- Show determinate progress only when tied to completed startup work; otherwise use an indeterminate state.
- Pause rendering when the window is hidden.
- Respect `prefers-reduced-motion`; retain a still monochrome mark and readable status.
- Keep GPU work bounded and provide a static fallback if WebGL 2 is unavailable.
- Do not make users wait for a minimum animation duration once startup is complete.

## Quality review
Review the actual app at the target window size, check the reduced-motion path, WebGL fallback, runtime failure/retry state, typography, contrast and real startup status. Do not call a build, accessibility audit or performance test passed until it has actually run.

## Research references
- Nielsen Norman Group, AI Prototyping in Real Design Contexts: https://www.nngroup.com/articles/ai-prototyping/
- Nielsen Norman Group, The Role of Animation and Motion in UX: https://www.nngroup.com/articles/animation-purpose-ux/
- Nielsen Norman Group, Visibility of System Status: https://www.nngroup.com/articles/visibility-system-status/
- W3C, WCAG 2.2: https://www.w3.org/TR/wcag/
- W3C, prefers-reduced-motion technique: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- MDN, WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- MDN, Animation performance: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate
- Microsoft, Windows typography: https://learn.microsoft.com/windows/apps/design/signature-experiences/typography
