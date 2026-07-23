/**
 * Kept in sync manually with the keys of visualTemplateRegistry
 * (src/components/visuals/registry.ts) — not imported from there directly
 * since that module pulls in React components, and this list is also used
 * server-side (in the modify-lesson prompt) where that bundle has no
 * reason to load. Template additions are rare, deliberate edits; see
 * VISUAL_TEMPLATE_GUIDE.md.
 */
export const KNOWN_TEMPLATE_IDS = [
  "radial-charged-sphere",
  "force-vector-diagram",
  "particle-container",
  "process-flow-diagram",
  "coordinate-geometry",
  "wave-diagram",
  "simple-circuit",
  "long-charged-wire",
  "infinite-plane",
  "electric-dipole",
  "dielectric-polarization",
  "generated-illustration",
] as const;
