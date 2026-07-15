// Build-time flag injected by `define` in vite.demo.config.mjs for the
// frontend-only judge demo. It is left undefined in the real Devvit build
// (vite.config.ts), where `typeof __DEMO__ === 'undefined'` keeps the demo mock
// backend and banner out of the shipped app.
declare const __DEMO__: boolean | undefined;
