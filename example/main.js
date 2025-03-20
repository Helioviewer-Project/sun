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

const aia304 = new StaticSun(13, new Date("2024-07-02 00:00:00Z"));
const aia304Scene = new THREE.Scene();
aia304Scene.add(aia304);

const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    renderer.render(aia304Scene, camera);

    requestAnimationFrame(animate);
}

animate();
