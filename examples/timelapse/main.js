import { Quality, Sun, SunConfig } from "@helioviewer/sun"
import CameraControls from "camera-controls";
import * as THREE from "three";
CameraControls.install({ THREE });
SunConfig.model_path = `${import.meta.env.BASE_URL}/models/zit.glb`;

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

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('canvas')});
renderer.setSize(window.innerWidth, window.innerHeight);
const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.setLookAt(0, 0, 3, 0, 0, 0);
cameraControls.zoomTo(2)

function MakeSun(id, start, end, sliderId) {
const sun = new Sun(id, start, end, 60, Quality.Default);
  if (typeof sliderId !== "undefined") {
    document.getElementById(sliderId).oninput = (e) => {
        sun.opacity = parseFloat(e.target.value);
    }
  }
  const scene = new THREE.Scene();
  scene.add(sun);
  return [sun, scene];
}

// Load images for AIA 304 and IRIS 1330 between this start and end time range.
const start = new Date("2024-01-18 11:10:16Z");
const end = new Date("2024-01-18 11:27:13Z");
const [aia304, aia304scene] = MakeSun(13, start, end, "slider1");
const [iris, irisScene] = MakeSun(88, start, end, "slider2");

const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    // This render trick is needed since the 3D models share the same space.
    // This prevents the z-fighting problem by ignoring the Z-depth.
    renderer.autoClear = true;
    renderer.render(aia304scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(irisScene, camera);

    requestAnimationFrame(animate);
}
animate();

// Update the model textures to show off animation.
const current = new Date(start);
function StartAnimation(fps) {
  return setInterval(() => {
    aia304.SetTime(current);
    iris.SetTime(current);

    // Move time forward by 1 minute
    current.setMinutes(current.getMinutes() + 1);
    // If we go past the end time, reset back to start time.
    if (current.getTime() > end.getTime()) {
      current.setTime(start.getTime());
    }
  }, 1000/fps);
}
// start animation at 30fps
let interval = StartAnimation(30);

// Update animation speed when FPS input is changed.
document.getElementById('fps').oninput = (e) => {
  let newFps = parseFloat(e.target.value);
  if (isNaN(newFps)) { newFps = 30; }
  clearInterval(interval);
  interval = StartAnimation(parseFloat(newFps));
};
