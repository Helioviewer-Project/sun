import { StaticSun, SetHelioviewerApiUrl } from "@helioviewer/sun"
import CameraControls from "camera-controls";
import * as THREE from "three";
CameraControls.install({ THREE });

SetHelioviewerApiUrl("http://localhost:8081/?action=")
/** Scene setup */
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
// const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('canvas')});
renderer.setSize(window.innerWidth, window.innerHeight);
const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.setLookAt(0, 0, 350, 0, 0, 0);
cameraControls.zoomTo(0.05)

function MakeSun(id, date, lookAt, sliderId) {
  const sun = new StaticSun(id, date);
  if (typeof lookAt !== "undefined") {
    sun.lookAt(lookAt)
  }
  if (typeof sliderId !== "undefined") {
    document.getElementById(sliderId).oninput = (e) => {
        sun.opacity = parseFloat(e.target.value);
    }
  }
  const scene = new THREE.Scene();
  scene.add(sun);
  return scene;
}

const date = new Date("2025-03-31 12:00:00Z");
const punch = MakeSun(131, date, undefined, "slider1");
const sdo = MakeSun(13, date, undefined, "slider2");

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
renderer.autoClear = false;
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    // Clear the scene so we can start drawing the next frame.
    renderer.clear();
    renderer.render(sphereOccluder, camera);
    renderer.render(punch, camera);
    renderer.clearDepth();
    renderer.render(sdo, camera);

    requestAnimationFrame(animate);
}

animate();
