// Minimal ambient declaration for `ffprobe-static`, which ships no types.
// The package's CommonJS module exports the absolute path to the bundled
// ffprobe binary as `path` (see node_modules/ffprobe-static/index.js).
declare module 'ffprobe-static' {
  export const path: string;
}
