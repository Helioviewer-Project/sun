/**
 * Sources IDs that should be rendered on a plane rather than a hemisphere
 */
// Sources whose observations cover only a planar field of view and must not
// be projected over the complete solar sphere.
const SURFACE_PLANE_SOURCES = [
  601, 602, 603, 604, 605, 606, 607, 608,
];

const PLANE_SOURCES = [
  4, 5, 28, 29, 30, 31, 83, 131, 134,
  // Solar Orbiter / SPICE spectral lines.
  ...SURFACE_PLANE_SOURCES,
];

export { PLANE_SOURCES, SURFACE_PLANE_SOURCES };