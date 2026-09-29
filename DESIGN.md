---
name: Kargo Hiring
description: A founder's hiring operating tool where the evidence outranks the score.
colors:
  accent: "#1f5c55"
  accent-hover: "#174841"
  accent-soft: "#e9f1ef"
  accent-line: "#b9d2cd"
  canvas: "#f7f6f3"
  surface: "#ffffff"
  rail: "#f1efea"
  hover: "#f3f1ec"
  selected: "#ebe8e1"
  ink: "#1c1b19"
  ink-2: "#3f3d38"
  muted: "#6b6963"
  faint: "#a19e95"
  line: "#e7e4dd"
  line-strong: "#d5d1c7"
  warn: "#8a5a12"
  warn-dot: "#c98a1e"
  warn-soft: "#fbf3e4"
  danger: "#9c3526"
  danger-soft: "#fbece8"
typography:
  score:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  hero:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.125rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.015em"
  name:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.375rem"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.90625rem"
    fontWeight: 400
    lineHeight: "1.45rem"
    fontFeature: "ss01, cv11"
  sm:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.84375rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  meta:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78125rem"
    fontWeight: 400
    lineHeight: "1.125rem"
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.71875rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "5px"
  md: "7px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  row: "14px"
  lg: "20px"
  xl: "24px"
  section: "40px"
  column-gap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "34px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    textColor: "{colors.ink-2}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "34px"
  button-danger-hover:
    backgroundColor: "{colors.danger-soft}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "34px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 28px 0 10px"
    height: "32px"
  segmented:
    backgroundColor: "{colors.rail}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-option-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "28px"
  segmented-option:
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    height: "28px"
  nav-item:
    textColor: "{colors.ink-2}"
    typography: "{typography.sm}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "32px"
  nav-item-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
  decision-shortlist-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "34px"
  decision-hold-active:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.md}"
    height: "34px"
  decision-not-shortlist-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "34px"
  probe-block:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  work-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.sm}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
---

# Design System: Kargo Hiring

## Overview

**Creative North Star: "The Founder's Ledger"**

Kargo Hiring is an operating tool, not a dashboard. The page reads like a well-kept ledger: a warm off-white canvas, white work surfaces where something is being composed, charcoal ink, and hairline rules that separate rows and sections. Hierarchy comes from type size, weight and ink tone, and from 1px lines. Boxes are rare. The overview on the detail page is a definition list set in type, and the score breakdown, rubric and connected-services lists are ruled lists, not cards.

Density is set for a founder scanning sixty candidates in a 45-minute window. Rows are 14px-padded table rows. Section rhythm is 40px. The one large number on any screen is the overall score. Everything else is 16px or smaller. One accent, Kargo petrol, marks what can be acted on or has been chosen. Amber and muted red mark Hold and errors, and each always comes with a text label.

The system refuses the AI-screener template. There are no gauges, radar charts, metric-card walls or chat-bubble evidence. Evidence appears as a quoted block with a single hairline left rule, beside a plain-text reason.

**Key Characteristics:**
- Warm neutral canvas, a deeper rail for navigation, white surfaces only for composing and floating layers.
- One family (Geist Sans) with a fixed rem scale from 11.5px to 36px. Every number is set in tabular figures.
- Structure from 1px hairlines (`line`, `line-strong`), not filled containers.
- One accent, used for primary action, selection, focus, positive state and the probe tint.
- Status is always a shape, a colour and a text label together.
- Motion lasts 120 to 240ms with ease-out, and only when state changes. First arrivals are CSS-only, once per session, and end by 700ms (see Motion).

## Colors

A warm paper-and-ink neutral range with one petrol accent and two quiet semantic hues.

### Primary
- **Kargo Petrol** (`accent`): primary buttons, the active Shortlist decision, keyboard focus outline and input focus border, checkboxes, the Sent check, the Shortlisted status dot, 4–5 point rubric segments, and "Strong evidence" text. Links that lead to the next step ("Open candidate") also use it.
- **Deep Petrol** (`accent-hover`): hover state for primary buttons and accent links only.
- **Petrol Wash** (`accent-soft`): text selection, the 3px input focus ring, the "What to probe" block, the drag-over dropzone, and the fill inside the Email-ready ring.
- **Petrol Rule** (`accent-line`): the email composer border while it is in Edit mode.

### Neutral
- **Warm Paper** (`canvas`): page background and modal footers.
- **Rail** (`rail`): sidebar and mobile drawer, Segmented tracks, and the dropzone icon well.
- **Surface White** (`surface`): work surfaces (composer, processing panel, upload list, empty-state frame), inputs, secondary buttons, floating layers, and the hover state of table rows.
- **Hover** (`hover`) and **Selected** (`selected`): hover fill for ghost buttons and nav items, and the selected fill for the active nav item and the active Not-shortlist decision. Skeleton shimmer runs between these two.
- **Charcoal Ink** (`ink`): headings, names, scores, primary body text.
- **Ink Two** (`ink-2`): secondary text, table cell content, evidence quotes, and the score track fill. It also fills 1–3 point rubric segments.
- **Muted** (`muted`): labels, metadata, descriptions, placeholders, and the Not-shortlisted dot. It draws the Pending-review ring.
- **Faint** (`faint`): hover borders, the dim arrow on table-row hover, and the pulsing Screening dot.
- **Hairline** (`line`) and **Strong Hairline** (`line-strong`): `line` separates rows and sections and outlines floating layers. `line-strong` outlines controls and draws the evidence quote rule.

### Semantic
- **Hold Amber** (`warn` text, `warn-dot` dot, `warn-soft` fill): Hold status, the active Hold decision, missing email or unverified-quote warnings, and Test mode.
- **Muted Red** (`danger` text, `danger-soft` fill): failed states, field errors (`aria-invalid` border), send failures, weights that do not total 100%.

### Named Rules
**The One Accent Rule.** Petrol is the only hue with agency. If something is petrol, it is actionable, chosen, focused or positive. Never use it for decoration.

**The Never-Colour-Alone Rule.** Amber and red always come with words, and usually with an icon. A coloured dot never appears without its label.

## Typography

**Body Font:** Geist Sans (with ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Mono Font:** Geist Mono. It is used only for environment-variable names in the setup notice.

**Character:** A single neo-grotesque carries everything. Rank comes from size, weight (400/500/600) and the ink ramp. The body has `ss01` and `cv11` enabled, and every number uses tabular figures.

### Hierarchy
- **Display** (560, `clamp(1.75rem, 1.1rem + 1.9vw, 2.75rem)`, so 28px at 390, 41.9px at 1280 and 44px from 1440; line-height 1.06, -0.028em): the dashboard masthead headline ("{Name} is next.") and the candidate name on the detail page. Balanced, and never more than two lines for real names.
- **Headline** (560, `clamp(1.625rem, 1.2rem + 1vw, 2.125rem)`, 26px to 34px; line-height 1.12, -0.022em): editorial page titles in the PageHeader (Upload, Settings, Not found).
- **Standfirst** (400, `clamp(1rem, 0.9rem + 0.35vw, 1.125rem)`, 16px to 18px; line-height 1.56): the masthead why line and page descriptions, in `ink-2`, capped at 68ch.
- **Figure** (600, 20px / 24px, tabular): the counts in the ledger strip.
- **Score** (600, 36px / 36px, -0.03em, tabular): the overall score on the detail page. Only one appears per screen, it stays 36px, and it never counts up.
- **Hero** (600, 28px / 34px, -0.02em): retained token; the candidate name now uses Display.
- **Title** (600, 21px / 28px, -0.015em): retained token; page titles now use Headline.
- **Name** (600, 16px / 22px, -0.01em): section titles (AI screening, Score breakdown, Interview brief, Email draft), modal titles, empty-state titles, and counts in the summary filter.
- **Body** (400, 14.5px / 23.2px): prose, evidence quotes, reasons, and the email body. Measure is capped at 68–70ch.
- **Small** (400/500, 13.5px / 20px): table cells, buttons, controls, nav items, and status labels.
- **Meta** (400, 12.5px / 18px): timestamps, hints, helper text, and the summary filter labels.
- **Label** (500, 11.5px / 16px, sentence case): field labels, table headers, `dt` terms, and the "Hiring" nav group label.

### Named Rules
**The One Big Number Rule.** The 36px score step is reserved for the overall score. Other scores use Name (cross-role score) or Small (criterion points).

**The Tabular Rule.** Every number that can change or be compared uses tabular figures: scores, ranks, counts, points, timestamps and file sizes.

## Layout

- **Shell:** at `lg` (1024px) and above, a two-column grid holds a 232px sticky sidebar on `rail` with a right hairline, next to the content. Below `lg` the sidebar is hidden and the bar's menu button opens a 256px left drawer. The active nav item carries a 2px petrol tick at its left edge that slides between items over 240ms; the rail and the drawer each have their own tick, so the two never animate into each other.
- **Sticky utility bar** (`#app-bar`): one solid bar at the top of the content column, 48px below `lg` and 56px from `lg` (`--bar-h`). It is opaque `.paper` (canvas plus grain), with no glass and no blur, and gains a `line` hairline once the page scrolls more than 4px. It holds the menu button and wordmark (below `lg`), the empty `#bar-slot` (the detail page portals its running head there, and nothing essential goes there), a 240px search (from `sm`), a secondary Upload CV button (hidden on Upload and Settings), and the 32px profile avatar. It replaces the per-page HeaderTools.
- **Content:** max width 1240px, centred. Horizontal padding is 16px, then 32px from `sm` (640px) and 48px from `lg`. There is 80px of padding at the bottom. `main` clips horizontal overflow (`overflow-x: clip`, `hidden` as the fallback) so sticky positioning keeps working.
- **Page header:** editorial and tool-free: a Headline title over a Standfirst description, with 32–40px top padding and 32px below. The bar owns search, upload and the account.
- **Dashboard masthead:** a full-bleed band above a `line-strong` rule, set as an editorial split. The left column carries the page title and a tabular kicker ("ranked by AI score on the PM rubric"), the Display headline "{Name} is next.", a status row, the why line with the inline score segments, one quoted line of CV evidence, and the one petrol action beside the queue pager. From `xl` the right track is the Masthead Plate (see Motion); nothing sits on it.
- **Dashboard:** the masthead comes first, then the ledger strip (tabular counts that are also the status filter), then compact selects, then the ranked table. The table shows from `md` (768px). Below `md` it becomes stacked rows (name and score, a meta line, then status) separated by hairlines. Columns drop by breakpoint: Applied role and Concern appear from `lg`, and Updated and the score track from `xl` (1280px).
- **Detail:** the identity and decision header sits above a hairline. Below it is a two-column grid, `minmax(0,1fr)` and `minmax(340px,400px)`, with a 48px column gap and a 40px row gap. It becomes one column below `lg`, with the Interview brief and Email draft following AI screening.
- **Rhythm:** 4px base. Table rows use 14px vertical padding. Labels sit 4–6px above values. Controls in a group are 8px apart. Sections are 40px apart, or 48px between major blocks on Settings.

## Elevation & Depth

Depth comes from tone and hairlines: canvas, then rail, then surface, with 1px lines. There are two shadows.

### Shadow Vocabulary
- **Pop** (`box-shadow: 0 1px 2px rgb(38 33 24 / 0.06), 0 10px 28px -10px rgb(38 33 24 / 0.22)`): only for floating layers. That means toasts, the confirmation modal, the profile menu, the mobile drawer, and the skip link.
- **Raise** (`box-shadow: 0 1px 2px rgb(38 33 24 / 0.05)`): a 1px contact shadow on the primary button and on the selected option of a Segmented control or the summary filter. It marks a physically "pressed-in" or chosen control, not a lifted surface.

The modal backdrop is `ink` at 25% and the drawer scrim is `ink` at 20%.

### Texture
The canvas carries a static film grain, the `--grain` token: an ink-tinted SVG `feTurbulence` tile (160px, peak alpha about 2.7%) rasterised once and never redrawn. It sits on `body` and on the opaque sticky layers (`.paper`: the utility bar and the table head) so they match the page. It has zero runtime cost and is not animated.

### Named Rules
**The Flat Work Rule.** Work surfaces (composer, panels, lists) are flat, with a hairline border and no shadow. Only something that floats above the page gets Pop.

## Shapes

- **Radius family:** 5px (`sm`) is used for small hit targets such as text-button focus outlines, segmented options, icon buttons and the skeleton. 7px (`md`) is used for buttons, inputs, selects, nav items and filter cells. 10px (`lg`) is used for work surfaces, toasts, the modal, the probe block and the dropzone. Avatars and status dots are fully round.
- **Borders:** every border is 1px. The one exception is the 1.5px Email-ready ring. The dropzone is the only dashed border.
- **Evidence rule:** quoted evidence carries a 1px `line-strong` left border with 14px left padding. The reason and empty-evidence text keep a transparent 1px border so they align with it.

## Components

### Buttons
Quiet, compact and exact.
- **Shape:** 7px corners. `md` is 34px high with 14px side padding. `sm` is 28px high with 10px side padding. Text is Small, weight 500, with a 6px icon gap and 14px Lucide icons.
- **Primary:** petrol with white text and the Raise shadow. It turns Deep Petrol on hover.
- **Secondary:** a white surface with a `line-strong` border and ink text. On hover the border becomes `faint` and the fill becomes `hover`.
- **Ghost:** `ink-2` text with no border, and a `hover` fill on hover. Used for Edit, Preview, Reset, Copy brief and Cancel.
- **Danger:** a white surface with `danger` text, and a `danger-soft` fill on hover.
- **States:** a 1px downward shift on press. Transitions last 120ms with ease-out.
- **Disabled:** disabled buttons no longer use opacity. Primary becomes `muted` text on the `hover` fill with an inset `line` ring and no shadow (4.86:1). Secondary becomes `muted` on `hover` with a `line` border. Ghost becomes `muted`. Danger becomes `muted` on `hover`.
- **Loading is not disabled:** while loading, a spinner replaces the icon, the button sets `aria-busy` and `aria-disabled`, and clicks are ignored, but it keeps its colours (a loading primary stays petrol with white text and never flashes grey).

### Decision Bar ("Your decision")
There are three toggle buttons with `aria-pressed`: Shortlist, Hold and Not shortlist. They sit apart from the AI screening section, at the right of the detail header. At rest they look like secondary buttons with `ink-2` text. Active Shortlist is petrol with white text. Active Hold uses a `warn-soft` fill, `warn` text and a `warn-dot` border at 60%. Active Not shortlist uses the `selected` fill with ink text. Clicking the active decision undoes it. While a decision saves, its icon pulses.

### Status Indicator
Each status is a shape, a colour and a text label (Small, weight 500). The dot is 8px.
- Pending review: hollow `muted` ring, `ink-2` label.
- Screening or Sending: `faint` dot pulsing (1.6s), `muted` label.
- Shortlisted: filled petrol dot, petrol label.
- Hold: filled `warn-dot`, `warn` label.
- Not shortlisted: filled `muted` dot, `muted` label.
- Email ready: 1.5px petrol ring on `accent-soft`, petrol label.
- Sent: 14px check icon, petrol label.
- Failed or Send failed: filled `danger` dot, `danger` label.

### Score Marks
- **Score track** (dashboard): a 56 x 3px round track on `line`, filled with `ink-2`. It always sits beside the tabular score.
- **Score segments** (breakdown): five 16 x 6px segments with 3px gaps. Filled segments are petrol when the score is 4 or 5 and `ink-2` otherwise. Empty segments are `line`. They are always shown with "n / 5" and the weighted points.

### Criterion Breakdown
A ruled, expandable list with a 1px line above and between items. Each row is a button with `aria-expanded` containing the name (Small, weight 600), the evidence-strength line (Meta), the segments, the points and a chevron that rotates over 200ms. All rows start expanded. The expanded panel holds "Evidence from CV" (a quote block, plus an amber note if the quote isn't verified), then "Why this score", then an optional nested disclosure with the rubric description. A total row closes the list.

### Inputs / Fields
- **Style:** a white fill with a 1px `line-strong` border and 7px corners. Inputs are 34px high and selects 32px, with a custom chevron. Textareas are at least 160px high and use Body text.
- **Hover / Focus:** the border becomes `faint` on hover. On focus the border becomes petrol and gains a 3px `accent-soft` ring, with no outline.
- **Error / Disabled:** `aria-invalid` gives a `danger` border, and the error text below uses Meta in `danger` with `role="alert"`. Disabled fields use the `hover` fill and `muted` text.
- **Field:** the label (Label, `muted`) sits 6px above the control, with a hint or error below.

### Segmented Control
A radiogroup with a `rail` track, a 1px `line` border, 7px corners and 2px padding. Options have 5px corners. The active option is white with the Raise shadow and a 1px `line` ring; that white indicator slides between options over 200ms and is scoped per instance. Inactive options are `muted` and turn `ink` on hover. Disabled options use `faint` text, not opacity. `md` is 28px high and `sm` is 24px with Meta text. It is used for the rubric switch, email type and applied role.

### Summary Filter
A row of toggle cells (`aria-pressed`) with 7px corners and 12px x 8px padding. Each cell stacks a tabular count (Name, 600) over a label (Meta). The active cell is white with a 1px `line` ring and the Raise shadow. Inactive cells get a `hover` fill on hover.

### Table
A borderless, separated table. Headers use Label in `muted`. Rows have 14px vertical padding and a 1px `line` top border. Hovering a row turns it white, underlines the name and fades in a `faint` arrow. The whole row is clickable, and the name is also a real link.

### Email Composer
A 10px work surface with a 1px `line` border, which turns `accent-line` in Edit mode. It has a To row above a hairline, then either the preview (a Subject row and the body in `ink-2`) or the edit fields. Below it, ghost Edit/Preview/Reset buttons sit on the left and secondary Save or Mark ready and primary Confirm & send sit on the right. Confirm & send opens a modal. Once sent, the composer shows a petrol check with "Sent", the time and the recipient.

### Interview Brief
A definition list of label-over-body pairs. "What to probe" sits in an `accent-soft` block with 10px corners and 14px x 16px padding. Its label is petrol, weight 600, with the concern criterion at 80% opacity, and the probe text is Body weight 500.

### Overlays
- **Modal:** a native `<dialog>` up to 448px wide. It is a 10px surface with a `line` border, the Pop shadow and a 25% ink backdrop, and it rises in over 200ms. The title uses Name. The footer sits on `canvas` above a hairline, with buttons right-aligned. Esc and a backdrop click close it.
- **Toast:** bottom-centre, or bottom-right from `sm`. A maximum of three show at once. Each is a 10px surface with the Pop shadow and a petrol check or red alert icon. They last 4s, or 7s for errors, and announce through `aria-live="polite"`.
- **Drawer:** 256px, on `rail`, with the Pop shadow. It slides in over 200ms with ease-out. The background is `inert` while it is closed.

### Navigation
The Kargo wordmark (an 18px petrol container mark and a semibold name) sits above the "Hiring" group label and the nav items. Nav items are 32px high with 7px corners and Small text in `ink-2`. Hover uses the `hover` fill at 120ms. The active item uses the `selected` fill, weight 500, `ink` text, `aria-current="page"`, and the sliding 2px petrol tick. Settings is pinned to the bottom above a hairline. The search field is 32px high with a `line` border, a search icon, and a `/` shortcut shown in a kbd hint.

### Processing and Empty States
- **Processing:** a step list with 16px circles. Done steps are filled petrol with a check. The active step has a petrol ring and a pulsing dot. A failed step has a `danger` ring. The step list sits beside plain-language copy and a secondary Retry button.
- **Loading:** skeletons shimmer between `hover` and `selected` (1.4s linear).
- **Empty:** Name-sized title, Body text in `muted` capped at 46ch, and one action. It is left-aligned on mobile and centred from `sm`.

## Motion

Motion is finesse, not effect. The shared layer lives in `src/components/motion/*`: GSAP with ScrollTrigger registered once, Lenis smooth scroll driven by the GSAP ticker (`lerp` 0.13, `syncTouch` off, `respectReducedMotion` on), CSS first arrivals, and the one Vanta plate.

### The motion contract
1. **Pointer.** Nothing reads pointer position. There are no `mousemove`, `pointermove` or enter/leave handlers used for visuals. Hover is limited to colour, underline, fill, and a 2px icon nudge in the icon's own direction.
2. **Arrivals.** CSS-only, via `arrive()`, on the first document load of a session. Each finishes by 700ms, and staggers are 20 to 30ms. The only thing pre-hidden is the headline, by transform inside its mask, for at most 560ms, with no JS involved.
3. **State changes** take 120 to 220ms: colour 120, Segmented and nav tick 200 to 240, pager 220, running head 200. The only numeric animation is CountUp on status counts after a poll, 450ms.
4. **Scroll.** Exactly one scrubbed effect exists in the whole app: the dashboard masthead recession. Toggled ScrollTriggers are allowed: the running head and the table-head recede. There is no pin, no snap, no card stacking, no horizontal hijack and no scroll-reveal of rows, evidence or scores.
5. **Loops.** There are still exactly two: the screening pulse and the skeleton shimmer. The fog animates for at most 12s per view entry, then rests.
6. **Reduced motion.** The head script sets no arrival flag, and the global rule zeroes durations and delays. GSAP work runs inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`. The fog is never imported. Motion follows `MotionConfig reducedMotion="user"`. CountUp sets values immediately. Lenis keeps `respectReducedMotion`. Sticky positioning is kept, because it is position, not motion.
7. **Never** block input, leave `will-change` on permanently, or leave any element in `main` at opacity below 0.05 or `visibility: hidden` after 1.5s. Content never stays hidden if JS fails.

### Named exception: The Masthead Plate
One Vanta FOG, in palette neutrals only (`canvas` base, `line-strong` lowlight, `selected` midtone, `surface` highlight), on the dashboard only, from `xl` (1280px) up. It fills the image slot of the masthead's editorial split and is never behind text. Mouse, touch and gyro controls are off; speed is 0.35. It pauses off-screen and when the tab is hidden, and comes to rest after 12s. Under reduced motion, without WebGL and below `xl`, it is the static `--fog-still` and three.js is never imported. It has no hover effect of any kind. `--fog-still` is the only gradient in the product.

### Named Rules
**The Nested Scroller Rule.** Every nested scroller carries a `data-lenis-prevent` family attribute (the sidebar, the drawer, the dialog, the textarea, and the ledger strip with `data-lenis-prevent-horizontal` plus `data-scroll-y="page"`). Never set `scroll-behavior: smooth`, because it fights Lenis.

## Do's and Don'ts

### Do:
- **Do** separate content with 1px `line` hairlines and let type carry the hierarchy. Use a 10px white surface only for something being composed or processed.
- **Do** pair every status with its shape and its text label, following the Status Indicator mapping.
- **Do** set every score, rank, count and timestamp in tabular figures.
- **Do** keep the 36px Score step for the single overall score on a screen.
- **Do** keep transitions to 120ms (controls) or 200ms (panels, chevrons, drawer, rise-in) with `cubic-bezier(0.22, 1, 0.36, 1)`, and only on state change. Honour `prefers-reduced-motion`.
- **Do** use a 2px petrol `:focus-visible` outline with a 2px offset on every interactive element. Inputs use a petrol border with a 3px `accent-soft` ring instead.
- **Do** keep AI output ("AI screening", recommendations) visually and spatially apart from the "Your decision" controls.
- **Do** show evidence as a quote with a 1px left rule, next to a plain-text reason. When a criterion has no evidence, say so plainly.

### Don't:
- **Don't** use gauges, radar charts, donut scores, metric-card walls or chat-bubble evidence.
- **Don't** use petrol for decoration, illustration or emphasis that is not actionable, selected, focused or positive.
- **Don't** let amber or red stand alone as colour. Always add words.
- **Don't** put the Pop shadow on anything that does not float. Work surfaces stay flat.
- **Don't** use gradients, decorative illustration or large empty cards. The one exception is the Masthead Plate's `--fog-still`.
- **Don't** introduce a second typeface for display, or uppercase tracked labels. Labels are 11.5px sentence case in `muted`.
- **Don't** animate for ambience. The only loops are the screening pulse and the skeleton shimmer.
