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

const date = new Date("2024-01-18 12:31:00Z");
const sdo_pos = new THREE.Vector3(43284503.92959727, -12411499.056033596, 140550730.57956055);
const aia171Scene = MakeSun(10, date, sdo_pos, "slider1");

const irisScene = MakeSun(88, date, sdo_pos, "slider3");

const solo_pos = new THREE.Vector3(-11871559.40806384, 3937832.915950194, 140189566.56253082)
const solo171Scene = MakeSun(84, date, solo_pos, "slider2");


// Point for reference. Center of sun.
const sphereScene = new THREE.Scene();
const sphereGeometry = new THREE.SphereGeometry(0.0015625, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.z = 1;
sphereScene.add(sphere);

const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    renderer.autoClear = true;
    renderer.render(solo171Scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(aia171Scene, camera);
    renderer.clearDepth();
    renderer.render(irisScene, camera);
    renderer.clearDepth();
    renderer.render(sphereScene, camera);

    requestAnimationFrame(animate);
}

animate();
