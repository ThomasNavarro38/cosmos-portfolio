// `d3-force-3d` ships no type declarations and has no @types package. This
// ambient module keeps the strict typecheck honest at the call sites Story 1.5
// introduces; widen it as the solver actually uses more of the surface.
declare module 'd3-force-3d' {
  export interface SimulationNode {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
    index?: number;
  }

  export interface Force<N extends SimulationNode> {
    (alpha: number): void;
    initialize?(nodes: N[], random: () => number, numDimensions: number): void;
  }

  export interface Simulation<N extends SimulationNode> {
    tick(iterations?: number): this;
    restart(): this;
    stop(): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(min: number): this;
    alphaDecay(decay: number): this;
    alphaTarget(target: number): this;
    velocityDecay(decay: number): this;
    numDimensions(dimensions: number): this;
    nodes(): N[];
    nodes(nodes: N[]): this;
    force(name: string): Force<N> | undefined;
    force(name: string, force: Force<N> | null): this;
    randomSource(source: () => number): this;
    on(name: string, listener: ((this: Simulation<N>) => void) | null): this;
  }

  export function forceSimulation<N extends SimulationNode>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N>;

  export interface ForceManyBody<N extends SimulationNode> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
    theta(theta: number): this;
    distanceMin(distance: number): this;
    distanceMax(distance: number): this;
  }
  export function forceManyBody<N extends SimulationNode>(): ForceManyBody<N>;

  export interface ForceCenter<N extends SimulationNode> extends Force<N> {
    x(x: number): this;
    y(y: number): this;
    z(z: number): this;
    strength(strength: number): this;
  }
  export function forceCenter<N extends SimulationNode>(
    x?: number,
    y?: number,
    z?: number,
  ): ForceCenter<N>;

  export interface ForceCollide<N extends SimulationNode> extends Force<N> {
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }
  export function forceCollide<N extends SimulationNode>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): ForceCollide<N>;

  export interface ForceLinkDatum<N extends SimulationNode> {
    source: N | string | number;
    target: N | string | number;
    index?: number;
  }
  export interface ForceLink<N extends SimulationNode, L extends ForceLinkDatum<N>>
    extends Force<N> {
    links(): L[];
    links(links: L[]): this;
    id(id: (node: N, i: number, nodes: N[]) => string | number): this;
    distance(distance: number | ((link: L, i: number, links: L[]) => number)): this;
    strength(strength: number | ((link: L, i: number, links: L[]) => number)): this;
    iterations(iterations: number): this;
  }
  export function forceLink<N extends SimulationNode, L extends ForceLinkDatum<N>>(
    links?: L[],
  ): ForceLink<N, L>;

  export interface ForceAxis<N extends SimulationNode> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
  }
  export function forceX<N extends SimulationNode>(x?: number): ForceAxis<N>;
  export function forceY<N extends SimulationNode>(y?: number): ForceAxis<N>;
  export function forceZ<N extends SimulationNode>(z?: number): ForceAxis<N>;
}
