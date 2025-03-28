import { StaticSun } from "@helioviewer/sun"
import CameraControls from "camera-controls";
import * as THREE from "three";
CameraControls.install({ THREE });

/** Scene setup. Skip to line 39 for the interesting things. */
const aspectRatio = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspectRatio / -2,
    frustumSize * aspectRatio / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('canvas')});
renderer.setSize(window.innerWidth, window.innerHeight);
const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.setLookAt(0, 0, 3, 0, 0, 0);
cameraControls.zoomTo(2)

function MakeSun(id, date, sliderId) {
  const sun = new StaticSun(id, date);
  if (typeof sliderId !== "undefined") {
    const slider = document.getElementById(sliderId);
    slider.value = "1";
    slider.oninput = (e) => {
        sun.opacity = parseFloat(e.target.value);
    }
  }
  const scene = new THREE.Scene();
  scene.add(sun);
  return scene;
}

const date = new Date("2024-01-18 12:31:00Z");
// These are the three suns to be rendered.
// AIA is an image of the sun rendered on a sphere
const aia171Scene = MakeSun(10, date, "slider1");
// LASCO and KCOR are coronagraphs looking around the
// outside of the sun.
const lascoScene = MakeSun(4, date, "slider2");
const kcorScene = MakeSun(83, date, "slider3");

// This is an invisible sphere that's used to occlude, cover, hide
// portions of images that appear behind the solar sphere.
// This is important so that the images of the sun rendered within
// the sphere do not blend with the the coronagraphs behind it.
const sphereOccluder = new THREE.Scene();
const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const WHITE = 0xFFFFFF;
const sphereMaterial = new THREE.MeshBasicMaterial({ color: WHITE });
// IMPORTANT: The color is never drawn. Even though the sphere is white
// it will never be displayed. Comment this out to see where it is physically.
sphereMaterial.colorWrite = false;
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphereOccluder.add(sphere);

const clock = new THREE.Clock();
// We have to control clearing manually in order to make everything
// blend properly
renderer.autoClear = false;
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);

  // Clear the scene so we can start drawing the next frame.
  renderer.clear();
  // Draw both the sphere and the first coronagraph.
  // Using the occluder here hides a portion of the coronagraph
  // when the sphere overlaps it. Try commenting out the other
  // renders and only render these 2 objects to see what
  // the effect is.
  renderer.render(sphereOccluder, camera);
  renderer.render(lascoScene, camera);
  // This line to clear the depth buffer is required.
  // kcor and lasco will have some overlap. This overlap
  // will cause Z-Fighting (where the renderer won't know which
  // pixels are in front) which will lead to visible artifacts.
  // Try deleting it to see the visual artificats.
  renderer.clearDepth();

  // Next, the same thing is done for the second coronagraph.
  // The two coronagraphs will blend perfectly, and the
  // occlusion will help for the final rendering of the AIA image.
  renderer.render(sphereOccluder, camera);
  renderer.render(kcorScene, camera);
  // Again, clearDepth is required to prevent z-fighting.
  // Try commenting it out and see what happens to the AIA image.
  renderer.clearDepth();
  // Lastly, render the AIA image in the center.
  renderer.render(aia171Scene, camera);

  // As a final note, this sphereOccluder is only required when
  // rendering spheres and planes in the same scene. If only
  // planes (coronagraphs and similar) are rendered, then you likely
  // will not want to occlude the solar portion.

  requestAnimationFrame(animate);
}

animate();
