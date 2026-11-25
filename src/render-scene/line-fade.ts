/**
 * The line-work realism replaces, as it fades (9.4, 9.6, 9.7, 9.8, 9.9, 9.10, AD-19 and AD-22
 * as amended): a Star's outline and core dot fall on the realism layer's one fade, as its
 * emissive core rises, every Planet's orbit hairline falls on it as its debris belt rises
 * (9.6), the Rail's hairline as its nebula ribbon rises (9.7), a Deep Planet's Ring and
 * Moon as its ring disc and moon sphere rise (9.8), and a Planet's outline as its
 * atmosphere rim rises (9.9); all return whole if realism fails. Pure, and structural, so
 * `node --test` runs it on fakes; `body-field.tsx` and `moon-field.tsx` hold their marks,
 * and `realism-mount.tsx` writes them.
 *
 * **Every Body's billboard, orbits, the Rail, Rings and Moons only.** `holdBodyMarks` keeps
 * each Body's billboard by its ID, a Star's or a Planet's (9.9: a Planet's outline, and the
 * Ring line inside its billboard, fall with the rest). `holdReplacedLine` keeps a line only
 * when its ID is an orbit's (`orbit:`), the Rail's (`rail`) or a Ring's (`ring:`), and never
 * any other. Since 9.9 a Ring is reached twice, by its own `ring:` hold and through its
 * Planet's billboard; both write the same value in the same call, so the second is
 * harmless, and the `ring:` hold is kept so a Ring never depends on where it is mounted.
 * The Moons are `moon-field.tsx`'s own pool of meshes, handed over whole, and `fadeMarks`
 * skips a handle not mounted yet.
 *
 * **One write per frame, in the mount (9.10).** Each binding registers a `LineWorkSource`,
 * a thunk returning the marks it holds now, with the mount's `holdLineWork`, and the mount's
 * one frame callback hands every source to `fadeLineWork` right after the owner's frame, on
 * that frame's one `lineWorkFade()` read. So the line-work and the layer change on the same
 * frame, from the same value, and a failure the owner catches in that frame returns the
 * line-work whole on that frame. The write is per mark: a source or a mark that throws is
 * skipped and every other mark is still written, so the mount never throws into R3F.
 *
 * **Whole, never Body by Body.** `fadeMarks` writes one value to every held object: each is
 * `visible` while the value is above 0, and every material under it takes the value as its
 * opacity. A value that is not finite reads as 1, so a bad read leaves the marks whole, and
 * any other is clamped to `[0, 1]`.
 */

/** A material, as far as the fade is concerned. */
export interface FadedMaterial {
  opacity: number;
}

/** A replaced mark (a billboard group, a line or a mesh), as far as the fade is concerned: three's `Object3D`, structurally. */
export interface ReplacedMarks {
  visible: boolean;
  traverse(visit: (object: object) => void): void;
}

/** What a binding registers with the mount (9.10): a thunk returning the marks it holds now. A handle not mounted yet may be `null` or `undefined`. */
export type LineWorkSource = () => Iterable<ReplacedMarks | null | undefined>;

/**
 * The ref callback's rule: a Body's billboard, a Star's or a Planet's (9.9), is held under
 * its ID while it is mounted, and dropped when React hands `null`.
 */
export function holdBodyMarks<Group>(held: Map<string, Group>, body: { readonly id: string }, group: Group | null): void {
  if (group === null) held.delete(body.id);
  else held.set(body.id, group);
}

/** The prefix of an orbit hairline's ID in `sceneLines`: `orbit:<planet id>`. */
const ORBIT_LINE_PREFIX = 'orbit:';
/** The Rail hairline's ID in `sceneLines`. */
const RAIL_LINE_ID = 'rail';
/** The prefix of a Ring's ID in `notableRings`: `ring:<planet id>`. */
const RING_LINE_PREFIX = 'ring:';

/**
 * The replaced lines' ref callback's rule (9.6, 9.7, 9.8): an orbit's line, the Rail's, or a
 * Ring's, is held under its ID while it is mounted, and dropped when React hands `null`. Any
 * other line is never held. A drei `Line` is a `Line2` mesh whose `LineMaterial` has
 * `opacity`, so `fadeMarks` fades it as it does a billboard.
 */
export function holdReplacedLine<Held>(held: Map<string, Held>, line: { readonly id: string }, object: Held | null): void {
  if (!line.id.startsWith(ORBIT_LINE_PREFIX) && line.id !== RAIL_LINE_ID && !line.id.startsWith(RING_LINE_PREFIX)) return;
  if (object === null) held.delete(line.id);
  else held.set(line.id, object);
}

/** Every held Body's marks, orbit line, Rail line, Ring and Moon at this fade: shown while it is above 0, every material at its clamped value. A handle not mounted yet (`null` or `undefined`) is skipped. */
export function fadeMarks(groups: Iterable<ReplacedMarks | null | undefined>, fade: number): void {
  const value = Number.isFinite(fade) ? Math.min(Math.max(fade, 0), 1) : 1;
  for (const group of groups) {
    if (group === null || group === undefined) continue;
    group.visible = value > 0;
    group.traverse((object) => {
      if (!('material' in object)) return;
      const material = object.material as FadedMaterial | readonly FadedMaterial[] | undefined;
      if (material === undefined || material === null) return;
      for (const each of Array.isArray(material) ? (material as readonly FadedMaterial[]) : [material as FadedMaterial]) each.opacity = value;
    });
  }
}

/** The mount's one write (9.10): every source's marks at this fade, by `fadeMarks`, one mark at a time. A source that throws, or a mark that throws, is skipped, silently, and every other mark is still written. */
export function fadeLineWork(sources: Iterable<LineWorkSource>, fade: number): void {
  for (const source of sources) {
    try {
      for (const mark of source()) {
        try {
          fadeMarks([mark], fade);
        } catch {
          // One bad mark never keeps the rest of its source from the fade.
        }
      }
    } catch {
      // One binding's bad read never reaches R3F, nor keeps the others from their fade.
    }
  }
}
