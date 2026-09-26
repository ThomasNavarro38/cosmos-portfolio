# Epic 2 Context: The Greybox Scene — Bodies, Rail, and Focus

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 2 turns the committed layout artifact into a working, interactive, deliberately untextured scene. A visitor scrolls backward through time along a Rail that stops at Clients, arrives at a stop that frames a whole Client system with every Project on screen and selectable, deliberately focuses one Project, watches its Skills condense out of the ambient Dust into labelled Motes, and reads a panel beside the scene without the camera drifting off what is being read. A keyboard visitor reaches every destination a pointer visitor reaches, through a DOM index that is the real interface while the camera is presentational. There is no visual identity in this epic — placeholder geometry only. The gate is a pacing question, not a beauty one: does the journey read as deliberate with no polish at all? Answering it now, while the scene is cheap to change, is the entire point of building greybox-first.

## Stories

- Story 2.1: The DOM destination index
- Story 2.2: The navigation state machine
- Story 2.3: Bodies at rest in the 3D scene
- Story 2.4: Dust at rest
- Story 2.5: Backward-time Rail traversal
- Story 2.6: Client-stop framing and derived Dwell
- Story 2.7: Focus entry, the panel shell, and scroll's two meanings
- Story 2.8: Condensation and Decay
- Story 2.9: Free flight in three layers
- Story 2.10: Escape precedence and reduced motion

## Requirements & Constraints

- **The renderer reads and never derives.** The scene consumes solved positions and pre-derived visual properties from the committed artifact. It contains no classification test, no mapping-rule computation, no conditional on a raw content field, and no force-simulation code. A value the scene needs and the artifact lacks is a change to the derivation, never a local computation.
- **Time runs backward.** Scrolling forward moves the camera from the present into the past, encountering the most recent Client first.
- **The Rail stops at Clients only.** ~5–6 Client stops, never one per Project. Dwell derives at Client granularity. The default Shot template operates on Clients. Projects are reached only by deliberate selection. Building a Project-granular journey is the single largest divergence available here and is invisible until the camera exists.
- **Shots name entities, never coordinates.** No world coordinate appears in a Shot definition or in camera code, so a re-solve carries every Shot with its subject.
- **A Client stop frames the entire system**, including the widest-orbit Project — a Project framed out of shot is unreachable from the Rail. Adding a Project in future must be framed automatically with no Shot authored and no camera work.
- **Dwell carries selectivity.** A Client system holding Deep Projects is held measurably longer than one holding only Shallow ones. Uniform Dwell across every stop is a failure: it teaches the visitor nothing about where to look. It must not read as stalling.
- **No connector geometry anywhere.** No line, edge, or connector between two Bodies, or between a Project and its Motes. Orbit is the only relational geometry.
- **No Body for a Company.** Company is an attribute; the scene holds ~5–6 Client Stars and ~10 Project Planets.
- **Dust is present at rest and never reads as fog.** No Body may be obscured or made luminance-ambiguous by the Dust behind or in front of it; if it is, density is too high.
- **No Mote exists while its Project is unfocused.** Skills have no permanent position and no permanent form — they are a medium changing state, not objects being shown and hidden.
- **Every Mote carries its label automatically** on Condensation, with no hover, no tooltip, no click. An unlabelled Mote delivers no information and reduces the mechanic to ornament.
- **Focus is exclusive and always deliberate** — click, tap, or Enter/Space. Never dwell, proximity, scroll-stop, or hover: a Client stop frames several Projects at once, so a resting cursor must not fire. Focus does not release on pointer-out.
- **Reading must not move the camera.** While a Project is focused, scroll belongs to the panel and the journey does not advance. This is the behaviour the whole reading journey depends on.
- **The scene is never occluded.** No modal, scrim, dimmed backdrop, or full-screen overlay at any point. Motes stay visible and in motion throughout the read.
- **Legibility outranks awe.** Where pacing, motion, or effect conflicts with a visitor's ability to read and comprehend, legibility wins.
- **Free flight is opt-in with the Rail as default**, and return to the Rail is guaranteed — from where it was left, or from the nearest Client stop.
- **The greybox has no visual identity.** Placeholder geometry sufficient to judge composition and pacing; the design system, Deep/Shallow visual channels, and panel typography all belong to the next epic.
- **Tuning values are deferred to this epic's greybox, and are shapes rather than numbers.** Dust density, Dwell durations, Condensation timing, and free-flight interpolation are all tuned here because it is cheapest here. Express them as parameters that can be adjusted without structural change.

## Technical Decisions

- **The DOM index is the source of truth for destinations, and it is built first.** A persistent `<nav>` with a nested Client → Projects list, present from First Paint before any 3D chunk loads, generated from the single emitted destinations list and nothing else. It never reads render state, never re-projects, and never moves with the camera. Building the camera before the index produces an inverted architecture that is invisible until assistive technology meets it.
- **Focus lives in the DOM; the camera reacts to it, never the reverse.** Enforceably: the camera writes no state field, and no module outside the scene directory imports camera state. Pointer raycasting is the one accepted read of scene geometry, and it resolves to an emitted destination ID rather than a camera-dependent position.
- **One store owns navigation.** It holds the mode (rail | freeflight), the focused Project ID, the Rail position indexed by *Client*, and the origin the Focus was entered from. Camera and index are both subscribers; neither owns state. All transitions are named events; no component mutates state directly.
- **One writer per state field**, documented and enforced. Continuous scroll progress and the discrete current Client are separate fields: the camera reads progress, the index reads the discrete Client, neither writes the other's. Focus origin is *stored at entry*, never inferred at release — inference is what makes Escape return to the wrong layer.
- **Scroll's two meanings are selected solely by reading the mode.** Never by event-target inspection or DOM hit testing.
- **Inside the render loop, read the store imperatively** (`getState()`), never through a reactive hook binding — a subscription there re-renders every frame.
- **One destination set, three doors.** Click-to-fly, the pull-back overview, and the keyboard index all resolve against the same emitted list. A keyboard visitor is never given a smaller map than a pointer visitor.
- **Escape releases exactly one layer, innermost first**, and is inert on the Rail with nothing focused. It never releases two states at once and never returns a visitor more than one step.
- **Condensation and Decay are one implementation reversed**, on one easing curve, so the two directions cannot drift apart under tuning. The same principle applies to the Focus transition, which is one combined move — camera recompose, panel open, and Condensation on a single curve. The panel never appears while the camera is stationary.
- **Reduced motion shortens durations; it never introduces a cut.** The governing law is about continuity, not duration. Parallax, drift, and idle orbital motion stop (orbits are drawn, not animated); Dwell is unchanged, because reading time is not motion. Reduced motion and capability routing are independent axes — no code path may read the motion preference to make a capability judgement.
- **Namespaces:** entry, routing, navigation state, and the DOM index live in the shell; the 3D scene is its own directory. The scene never imports authored data. Import boundaries are enforced by the build gate, so a violation fails rather than lingers.
- **The scene loads as a lazy chunk** and must not be reachable from the entry path's module graph. This epic replaces the placeholder entry, so it is where the chunk split first becomes real.
- **Vocabulary is fixed and load-bearing:** Body, Mote, Notable, Deep/Shallow Project, Focus, Condensation, Rail, Shot, Dwell, Dust. A synonym in code or copy is a discipline violation.
- **Scene correctness is perceptual and is tested by looking at it.** Derivations are unit-tested upstream; do not build an automated harness for camera feel.

## UX & Interaction Patterns

- **The camera has mass.** Scroll velocity maps to camera velocity, damped — the camera does not stop the instant the wheel does. A Rail stop is a slowdown, not a halt: departure begins before the visitor has finished scrolling into it.
- **The governing law: it does not jump, it flies.** No cuts anywhere — not between stops, not into free flight, not on window resize, and not as a transition that begins only after the previous one has fully stopped.
- **A Client Star is a place, not a record.** Activating one flies to its stop and frames the system; there is no Client-level panel. Activating a Project enters Focus.
- **Clicking empty space does nothing.** A visitor exploring a mostly-empty frame clicks the void constantly and must not be punished with a dismissal.
- **No drag, no orbit-by-drag, no pinch-zoom.** Free flight is addressed, not piloted.
- **The pull-back overview makes the boundary legible** rather than enforcing it with an invisible wall — a lost visitor frames the whole universe and picks.
- **Keyboard grammar:** Tab / Shift+Tab traverse the index in Rail order (present → past, Projects nested under their Client); Enter/Space activate identically to the pointer equivalent; ↑/↓ advance and reverse along the Rail as the keyboard equivalent of scroll; Home returns to the opening frame; Escape releases one layer.
- **Accessibility structure the floor rests on:** each index entry is a `<button>` carrying the Client name or Project title as its accessible name, with Deep/Shallow exposed as *text within the entry* — not an ARIA attribute, not a visual marker — because a screen-reader user must be able to answer which entries are worth reading. The canvas root is `aria-hidden`, since narrating it twice is worse than not narrating it once. On Focus entry, DOM focus moves to the panel container (`tabindex="-1"`, labelled by the entry's heading); on release it returns to the entry that opened it, never to the document root and never lost to the canvas. `aria-pressed` on the entry reflects Focus. There is no keyboard trap: Tab from the panel returns to the scene's destination order.
- **Skills reach assistive technology through the panel, not the orbit** — present in the panel's DOM as a list at the moment Condensation begins, from the same markup that drives the visual Motes. No live region; narrating an orbit is noise.
- **The panel is a fixed side column beside the scene**, taking column width rather than overlaying. In this epic it is a shell carrying, in order: Client kicker, Project title, the reading position, the field table. Typography and the Notable treatment are the next epic's.
- **The Shallow panel is the Deep panel with a different final block, never the Deep panel minus one.** Focusing a Shallow Project opens the panel normally — no error, no empty state, no skeleton, no visible hole.
- **Mote label placement:** three distinct orbits with an angular quota preventing adjacent-slot labels on the same orbit; a label anchors outward from its Body, flipping side by orbit half; a label that would land under the panel column is suppressed and its Mote re-slotted on the next frame, never truncated with an ellipsis.
- **Dust has two components:** a medium of broad radial gradients centred on each Client system, and sparse individual particles.
- **Condensation is fast** — it must complete faster than the reader's decision to look, because the information was asked for and the reader must not wait.
- **Focus moving from Project A to Project B is one continuous transition**, overlapping decay and condensation with a cross-fading panel, never a full decay followed by a re-condense.
- **No streaming pop.** Bodies arriving after First Paint fade up rather than appearing at final luminance. No loading screen, no progress bar, no splash, no click-to-enter, no skeletons.
- **No time-limited interaction.** Nothing dismisses itself, nothing expires, and no Dwell-driven state change removes something a visitor was reading.

## Cross-Story Dependencies

- **Epic 1 is a hard prerequisite.** Everything in this epic reads the committed layout artifact: solved positions, derived visual properties, the one destinations list, Client-granular Dwell tempo, and default Shot framing. None of it is recomputed here.
- **Story 2.1 before 2.2 before everything with a camera.** The index establishes the destination surface; the state machine establishes the single authority; the camera is a subscriber to both. Reversing this order produces the inverted architecture the epic exists to prevent.
- **Story 2.3 (Bodies) precedes 2.4 (Dust)** — Dust density is judged against Bodies that already exist, since the constraint is that no Body becomes ambiguous against it.
- **Stories 2.5 and 2.6 are one mechanism split in two:** traversal, then what arrival composes and how long it holds. Both depend on the state machine's separated progress and discrete-Client fields.
- **Story 2.8 (Condensation) depends on 2.4** — Motes must arrive from Dust that was already visible, so the Dust must exist first — and on 2.7, which owns Focus entry and the panel that hosts the Skills list.
- **Story 2.9 (free flight) depends on 2.1, 2.5, and 2.7** — its three layers all resolve against the index's destination set, its return contract needs the Rail, and its Project activation is Focus entry.
- **Story 2.10 (Escape precedence) depends on 2.7 and 2.9** — it arbitrates between the two layers those stories introduce, using the focus-origin field from 2.2.
- **Epic 3 depends on this epic** for the greybox it dresses; the Deep/Shallow visual channels, the design tokens, and the panel's finished typography all land there.
- **The entry-chunk bundle assertion is outstanding from Epic 1** and should land before this epic's chunk split, since that split is when a stray re-export could first hoist the scene into the entry silently.
- **Two config items from Epic 1 become live here:** whether the schema library belongs in runtime dependencies once a renderer reads the artifact, and scoping the TypeScript `.ts`-extension import allowance away from browser sources, where the bundler resolves differently.
