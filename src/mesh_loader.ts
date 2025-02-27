import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BufferGeometry, Matrix4, Object3D } from "three";

/**
 * Keep one loader initialized.
 * @private
 */
let stlloader = new STLLoader();
let gltfloader = new GLTFLoader();

type BufferCache = {
  [key: string]: BufferGeometry;
};
/**
 * Cache for meshes so that the same ones aren't reloaded
 * every time they're needed
 * @private
 */
let cache: BufferCache = {};

/**
 * Searches a gltf for a mesh to use.
 * @param gltf object loaded with the GLTFLoader
 * @returns {Geometry} the geometry to use
 * @private
 */
function _ExtractMeshFromGLTF(gltf: GLTF): BufferGeometry {
  let mesh: any;
  gltf.scene.traverse(function (child: any) {
    if (child.isMesh) {
      //Setting the buffer geometry
      mesh = child.geometry;
    }
  });

  return mesh;
}

/**
 * Loads an STL mesh from the given path
 *
 * @param {string} path Path to the stl file, relative to site root.
 */
async function LoadMesh(path: string): Promise<BufferGeometry> {
  if (cache.hasOwnProperty(path)) {
    return cache[path];
  } else {
    // Choose loader to use
    let loader = gltfloader;

    return new Promise((resolve, reject) => {
      loader.load(
        path,
        // on success
        (geometry) => {
          let mesh: BufferGeometry = _ExtractMeshFromGLTF(geometry);
          cache[path] = mesh;
          resolve(mesh);
        },
        // onProgress is not supported by threejs
        undefined,
        // on error
        (result) => reject(result),
      );
    });
  }
}

export { LoadMesh };
