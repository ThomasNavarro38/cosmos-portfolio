/**
 * The line-work realism replaces, as it fades (9.4, 9.6, 9.7, AD-19 and AD-22 as amended): a
 * Star's outline and core dot fall on the realism layer's one fade, as its emissive core
 * rises, every Planet's orbit hairline falls on it as its debris belt rises (9.6), and the
 * Rail's hairline as its nebula ribbon rises (9.7); all return whole if realism fails. Pure, and structural, so `node --test` runs it on fakes;
 * `body-field.tsx` binds it.
 *
 * **Stars, orbits and the Rail only.** `holdStarMarks` keeps a Star's billboard by its ID and
 * ignores every Planet, so a Planet's outline and Ring stay at their token values (9.9 and
 * 9.8 replace them). `holdReplacedLine` keeps a scene hairline only when its ID is an
 * orbit's (`orbit:`) or the Rail's (`rail`), and never any other, and 9.10 extends this
 * path to the rest of the line-work.
 *
 * **Whole, never Body by Body.** `fadeStarMarks` writes one value to every held object:
 * each is `visible` while the value is above 0, and every material under it takes the
 * value as its opacity. A value that is not finite reads as 1, so a bad read leaves the
 * marks whole, and any other is clamped to `[0, 1]`.
 */

/** A material, as far as the fade is concerned. */
export interface FadedMaterial {
  opacity: number;
}

/** A billboard group, as far as the fade is concerned: three's `Object3D`, structurally. */
export interface StarMarks {
  visible: boolean;
  traverse(visit: (object: object) => void): void;
}

/**
 * The ref callback's rule: a Star's billboard is held under its ID while it is mounted,
 * and dropped when React hands `null`. A Planet's is never held.
 */
export function holdStarMarks<Group>(held: Map<string, Group>, body: { readonly id: string; readonly kind: string }, group: Group | null): void {
  if (body.kind !== 'star') return;
  if (group === null) held.delete(body.id);
  else held.set(body.id, group);
}

/** The prefix of an orbit hairline's ID in `sceneLines`: `orbit:<planet id>`. */
const ORBIT_LINE_PREFIX = 'orbit:';
/** The Rail hairline's ID in `sceneLines`. */
const RAIL_LINE_ID = 'rail';

/**
 * The scene hairlines' ref callback's rule (9.6, 9.7): an orbit's line, or the Rail's, is
 * held under its ID while it is mounted, and dropped when React hands `null`. Any other line
 * is never held. A drei `Line` is a `Line2` mesh whose `LineMaterial` has `opacity`, so
 * `fadeStarMarks` fades it as it does a billboard.
 */
export function holdReplacedLine<Held>(held: Map<string, Held>, line: { readonly id: string }, object: Held | null): void {
  if (!line.id.startsWith(ORBIT_LINE_PREFIX) && line.id !== RAIL_LINE_ID) return;
  if (object === null) held.delete(line.id);
  else held.set(line.id, object);
}

/** Every held Star's marks, orbit line and Rail line at this fade: shown while it is above 0, every material at its clamped value. */
export function fadeStarMarks(groups: Iterable<StarMarks>, fade: number): void {
  const value = Number.isFinite(fade) ? Math.min(Math.max(fade, 0), 1) : 1;
  for (const group of groups) {
    group.visible = value > 0;
    group.traverse((object) => {
      if (!('material' in object)) return;
      const material = object.material as FadedMaterial | readonly FadedMaterial[] | undefined;
      if (material === undefined || material === null) return;
      for (const each of Array.isArray(material) ? (material as readonly FadedMaterial[]) : [material as FadedMaterial]) each.opacity = value;
    });
  }
}
