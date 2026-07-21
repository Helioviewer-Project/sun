import {
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Group,
  BackSide,
  Texture,
  Material,
  Object3D,
  AdditiveBlending,
  FrontSide,
  Matrix4,
} from "three";
import { PLANE_SOURCES, SURFACE_PLANE_SOURCES } from "./sourceinfo";
import { LoadMesh } from "./mesh_loader";

import {
  vertex_shader as SolarVertexShaderImproved,
  fragment_shader as SolarFragmentShaderImproved,
  SolarShaderUniforms,
} from "./glsl/solar_shader_improved";
import {
  fragment_shader as LascoFragmentShader,
} from "./glsl/lasco_shaders";
import { JP2Info } from "./helioviewer";
import { SunConfig } from "./config";
import { HelioviewerJp2Metadata } from "./HelioviewerJp2Metadata";

/**
 * Creates a flat plane that represents the backside of the sun.
 * This side will have only the energy coming off of the sun rendered on it.
 * @param {Texture} texture Sun image texture
 * @returns {Mesh}
 * @private
 */
async function _GetBackside(mainUniforms: SolarShaderUniforms): Promise<Mesh> {
  mainUniforms.backside.value = true;
  mainUniforms.opacity.value = 1.0;
  let geometry = await LoadMesh(SunConfig.model_path);
  let shader = new ShaderMaterial({
    // @ts-ignore
    uniforms: mainUniforms,
    vertexShader: SolarVertexShaderImproved,
    fragmentShader: SolarFragmentShaderImproved,
  });
  shader.depthTest = false;
  shader.transparent = true;
  shader.side = BackSide;
  shader.blending = AdditiveBlending;
  return new Mesh(geometry, shader);
}

async function CreateSphericalModelMesh(uniforms: SolarShaderUniforms): Promise<Mesh> {
  let geometry = await LoadMesh(SunConfig.model_path);
  let shader = new ShaderMaterial({
    // @ts-ignore
    uniforms: uniforms,
    vertexShader: SolarVertexShaderImproved,
    fragmentShader: SolarFragmentShaderImproved,
  });
  shader.transparent = true;
  shader.side = FrontSide;
  shader.blending = AdditiveBlending;
  return new Mesh(geometry, shader);
}

async function CreateSphericalModel(texture: Texture, jp2Meta: HelioviewerJp2Metadata, jp2info: JP2Info): Promise<Group> {
  const group = new Group();
  group.add(await _GetBackside(GenerateSphericalModelUniforms(texture, jp2Meta, jp2info)));
  group.add(await CreateSphericalModelMesh(GenerateSphericalModelUniforms(texture, jp2Meta, jp2info)));
  return group;
}

/**
 * Gets the dimensions of a flat plane according to the jp2info
 * @param {JP2Info} jp2info
 * @returns {any} Object with width, height fields.
 */
function _createPlaneGeometry(
  jp2Meta: HelioviewerJp2Metadata,
  projectToSolarSurface: boolean,
): PlaneGeometry {
  // Surface observations need enough vertices to follow the sphere. Ordinary
  // coronagraph planes remain a single flat quad.
  const widthSegments = projectToSolarSurface
    ? Math.max(16, Math.min(96, Math.ceil(jp2Meta.width() / 4)))
    : 1;
  const heightSegments = projectToSolarSurface
    ? Math.max(16, Math.min(128, Math.ceil(jp2Meta.height() / 4)))
    : 1;

  const geometry = new PlaneGeometry(
    jp2Meta.width(),
    jp2Meta.height(),
    widthSegments,
    heightSegments,
  );
  const wcs = jp2Meta.planeWcs();

  // PlaneGeometry uses an X/Y coordinate system whose origin is the raster
  // center. Apply the full FITS CD matrix, including anisotropic scale,
  // rotation and shear. Three.js Y points upward, matching helioprojective Y.
  geometry.applyMatrix4(new Matrix4().set(
    wcs.xx, wcs.xy, 0, 0,
    wcs.yx, wcs.yy, 0, 0,
    0,      0,      1, 0,
    0,      0,      0, 1,
  ));

  if (projectToSolarSurface) {
    const positions = geometry.getAttribute("position");

    for (let index = 0; index < positions.count; index += 1) {
      // The affine geometry is centered on the raster. Translate every point
      // to its helioprojective position before projecting it onto the visible
      // hemisphere x^2 + y^2 + z^2 = 1.
      const x = positions.getX(index) + wcs.centerX;
      const y = positions.getY(index) + wcs.centerY;
      const radiusSquared = (x * x) + (y * y);
      const z = Math.sqrt(Math.max(0, 1 - radiusSquared)) + 0.001;

      positions.setXYZ(index, x, y, z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  return geometry;
}

async function CreatePlaneWithTexture(texture: Texture, jp2Meta: HelioviewerJp2Metadata, jp2info: JP2Info, source: number): Promise<Group> {
  const projectToSolarSurface =
    SURFACE_PLANE_SOURCES.indexOf(source) !== -1;
  const geometry = _createPlaneGeometry(jp2Meta, projectToSolarSurface);
  let shader = new ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      x_offset: { value: jp2Meta.glOffsetX() },
      y_offset: { value: 0.0 },
      opacity: { value: 1 },
    },
    vertexShader: SolarVertexShaderImproved,
    fragmentShader: LascoFragmentShader,
  });
  shader.transparent = true;
  shader.blending = AdditiveBlending;
  const mesh = new Mesh(geometry, shader);
  const wcs = jp2Meta.planeWcs();
  if (!projectToSolarSurface) {
    mesh.position.set(wcs.centerX, wcs.centerY, 0);
  }
  // API expects all meshes to be groups, so add this mesh to a single group
  const group = new Group();
  group.add(mesh);
  return group;
}

/**
 * Updates a model's texture on the fly
 * @param group 3js object group containing the sun models
 * @param texture New texture to apply
 * @param jp2info
 */
function UpdateModelTexture(
  group: Group,
  texture: Texture,
  jp2info: JP2Info,
  jp2Meta: HelioviewerJp2Metadata,
  source: number,
) {
  // Iterate through the group and update the texture uniform.
  for (const _model of group.children) {
    let model = _model as any;
    if (
      model.hasOwnProperty("material") &&
      model.material.hasOwnProperty("uniforms")
    ) {
      model.material.uniforms.tex.value = texture;
      if (PLANE_SOURCES.indexOf(source) != -1) {
        model.geometry.dispose();
        const projectToSolarSurface =
          SURFACE_PLANE_SOURCES.indexOf(source) !== -1;
        model.geometry = _createPlaneGeometry(
          jp2Meta,
          projectToSolarSurface,
        );
        const wcs = jp2Meta.planeWcs();
        if (projectToSolarSurface) {
          model.position.set(0, 0, 0);
        } else {
          model.position.set(wcs.centerX, wcs.centerY, 0);
        }
        model.updateMatrix();
      } else {
        CopyUniforms(model.material.uniforms, GenerateSphericalModelUniforms(texture, jp2Meta, jp2info, model.material.uniforms.opacity.value, model.material.uniforms.backside.value));
      }
    }
  }
}

/**
 * Copies values into the given uniforms target.
 *
 * @param uniforms Target uniforms object
 * @param tex New texture
 * @param jp2Meta New jp2 metadata
 * @param jp2info New jp2 information
 */
function GenerateSphericalModelUniforms(tex: Texture, jp2Meta: HelioviewerJp2Metadata, jp2info: JP2Info, opacity: number = 1.0, backside: boolean = false): SolarShaderUniforms {
  return {
    opacity: { value: opacity },
    backside: { value: backside },
    tex: {value: tex},
    aspect: { value: jp2Meta.width() / jp2Meta.height() },
    scale: { value: jp2Meta.scale() },
    x_offset: { value: jp2Meta.glOffsetX() },
    y_offset: { value: jp2Meta.glOffsetY() },
    center_of_rotation: { value: jp2Meta.centerOfRotation() },
    rotate_degrees: { value: jp2info.solar_rotation }
  };
}

/**
 * setting model.material.uniforms = {new object} does not work. Something
 * due to object references, so this function copies everything over.
 */
function CopyUniforms(dst: SolarShaderUniforms, src: SolarShaderUniforms) {
  Object.keys(src).forEach((key) => {
    // @ts-ignore
    dst[key] = { value: src[key].value };
  })
}

/**
 * Computes the scale of the mesh to pass into the fragment shader
 * so that the texture fits in the correct spot on the mesh.
 * @param {JP2info} jp2info
 * @returns {number}
 * @private
 */
function _ComputeMeshScale(jp2info: JP2Info) {
  /**
   * See readme for notes about this computation.
   */
  return Math.min(jp2info.width, jp2info.height) / (4*jp2info.solar_radius);
}

/**
 * Sets the opacity on all model groups
 * @param {Group} model Model group returned by CreateSphericalModel
 */
function UpdateModelOpacity(model: any, opacity: number) {
  for (const sub_model of model.children) {
    if (sub_model.material.hasOwnProperty("uniforms")) {
      sub_model.material.uniforms.opacity.value = opacity;
    }
  }
}

/**
 * Frees a mesh's geometry and material
 */
function _FreeObject(mesh: Mesh) {
  mesh.geometry.dispose();
  (mesh.material as Material).dispose();
}

/**
 * Frees a model group
 * @private
 */
function _FreeGroup(group: Group) {
  for (const model of group.children) {
    FreeModel(model);
  }
}

/**
 * API for freeing a model created with one of the model builder functions
 * @param {Object} object
 */
function FreeModel(object: Object3D) {
  if (object.type == "Group") {
    _FreeGroup(object as Group);
  } else {
    _FreeObject(object as Mesh);
  }
}

export {
  CreatePlaneWithTexture,
  UpdateModelTexture,
  UpdateModelOpacity,
  FreeModel,
  CreateSphericalModel
};