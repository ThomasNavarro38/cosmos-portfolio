// Vite bundles a side-effect `import './x.css'`; `tsc` cannot resolve it and
// raises TS2882. The repo does not load `vite/client` types, so this declares the
// one form it uses: a stylesheet imported for its effect. The empty body exports
// no members, so a CSS-modules-style `import { panel } from './x.css'` is a type
// error rather than a silent `any`.
declare module '*.css' {}
