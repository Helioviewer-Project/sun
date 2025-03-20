import { StaticSun } from "@helioviewer/sun"
import CameraControls from "camera-controls";
import * as THREE from "three";
CameraControls.install({ THREE });

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

function MakeSun(id, date) {
  const sun = new StaticSun(id, date);
  const scene = new THREE.Scene();
  scene.add(sun);
  return scene;
}

const date = new Date("2024-03-18 14:41:00Z");
// const aia304Scene = MakeSun(10, date);
// const irisScene = MakeSun(88, date);
const solo171Scene = MakeSun(84, date);


// Point for reference. Center of sun.
const sphereScene = new THREE.Scene();
const sphereGeometry = new THREE.SphereGeometry(0.0125, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.z = 1;
sphereScene.add(sphere);

const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    renderer.autoClear = true;
    // renderer.render(aia304Scene, camera);

    // renderer.autoClear = false;
    // renderer.clearDepth();
    // renderer.render(irisScene, camera);
    // renderer.clearDepth();
    renderer.render(solo171Scene, camera);
    renderer.autoClear = false;
    renderer.render(sphereScene, camera);

    requestAnimationFrame(animate);
}

animate();
