// Vitest runs modules under plain Node resolution, so the `server-only`
// package's guard (which relies on the "react-server" bundler condition
// Next.js applies at build time) would throw unconditionally. This stub
// mirrors what Next.js's bundler resolves it to in an actual server
// context: a no-op.
export {};
