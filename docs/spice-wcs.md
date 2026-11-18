# SPICE WCS surface patches (draft)

Companion to https://github.com/Helioviewer-Project/api/pull/513 and the
helioviewer.org frontend WCS changes.

PC rows are multiplied by their own signed CDELT in angular units. Explicit
CD keywords take precedence. FITS CRPIX is one based; the raster center is
evaluated at its pixel edges using CRPIX - 0.5. Angular coordinates are divided
by the apparent solar radius at the observer. Surface geometry samples the
front hemisphere; texture coordinates retain the raster orientation. Reflected
matrices require reversed triangle winding. Legacy coronagraph planes keep
their original dimensions and offsets.

Run npm test and npm run build. The tests use the embedded XML from the real
SPICE O VI 103.19 nm fixture in API #513 (observation 67108978, 2021-08-21).
They check the independent PC/CD coefficients and raster center, surface
curvature, reflected winding, and preservation of coronagraph dimensions.
The fixture XML is metadata only, extracted unchanged from that JP2.

This remains draft. Browser views with AIA showed a SPICE patch over a nearly
black solar disk, so front/profile scientific alignment is not validated.
EUI and off-limb behavior also require validation; points outside the limb
currently clamp to z=0.001 rather than extending the photosphere.

The latest npm release checked on 2026-11-18 was 0.8.1 and lacks this feature.
Maintainers must publish a newer release after validation, then update the
frontend manifest and lockfile. Do not publish the local 0.8.0 validation
package over an existing release. Keep three as a peer dependency so solar
objects and the application's renderer share one Three.js instance.
