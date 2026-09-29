/**
 * Arrival motion for the candidate page, as CSS that runs from first paint. Nothing waits for JS, so a
 * hard load never flashes the final state and then replays it. Every animation here ends by 700ms and
 * uses `backwards` fill only: without CSS animation support the final state simply shows. Reduced
 * motion is handled by the global rule in globals.css, which zeroes durations and delays.
 *
 * React hoists this into <head> once (href + precedence) however many times it renders.
 */
const CSS = `
@keyframes kh-fill-x { from { transform: scaleX(0); } }
@keyframes kh-pop { from { opacity: 0; transform: scale(0.35); } }
@keyframes kh-label { from { opacity: 0; transform: translateY(3px); } }

/* Score composition ribbon: each slice's fill grows left to right, in sequence. */
[data-ribbon-arrive] [data-ribbon] li > a > span:first-child > span {
  transform-origin: 0 50%;
  animation: kh-fill-x 440ms var(--ease-editorial) backwards;
  animation-delay: 80ms;
}
${[2, 3, 4, 5, 6, 7, 8].map((n) => `[data-ribbon-arrive] [data-ribbon] li:nth-child(${n}) > a > span:first-child > span { animation-delay: ${80 + (n - 1) * 45}ms; }`).join("\n")}

/* Stage tracker: dots pop, connectors draw, labels settle. --s is the step index. */
[data-stage-tracker] [data-stage-dot] { animation: kh-pop 300ms var(--ease-editorial) backwards; animation-delay: calc(var(--s, 0) * 80ms); }
[data-stage-tracker] [data-stage-label] { animation: kh-label 300ms var(--ease-editorial) backwards; animation-delay: calc(var(--s, 0) * 80ms + 30ms); }
[data-stage-tracker] [data-stage-line] { transform-origin: 0 50%; animation: kh-fill-x 220ms var(--ease-out) backwards; animation-delay: calc(var(--s, 0) * 80ms + 90ms); }
`;

export function DetailMotionStyles() {
  return (
    <style href="kh-detail-motion" precedence="default">
      {CSS}
    </style>
  );
}
