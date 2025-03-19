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
  SphereGeometry,
} from "three";
import { PLANE_SOURCES } from "./sourceinfo";
import { LoadMesh } from "./mesh_loader";
import {
  vertex_shader as SolarVertexShader,
  fragment_shader as SolarFragmentShader,
} from "./glsl/solar_shaders";
import {
  vertex_shader as LascoVertexShader,
  fragment_shader as LascoFragmentShader,
} from "./glsl/lasco_shaders";
import { JP2Info } from "./helioviewer";
import { SunConfig } from "./config";

/**
 * Creates a flat plane that represents the backside of the sun.
 * This side will have only the energy coming off of the sun rendered on it.
 * @param {Texture} texture Sun image texture
 * @returns {Mesh}
 * @private
 */
async function _GetBackside(texture: Texture, scale: number, rotation: number, offsets: Offsets, aspect: number) {
  // Load the mesh
  let geometry = await LoadMesh(SunConfig.model_path);

  // Create the shader, this is where the uniforms that appear
  // in the shader are set.
  let shader = new ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      scale: { value: scale },
      aspect_ratio: { value: aspect },
      x_offset: { value: offsets.x },
      y_offset: { value: offsets.y },
      backside: { value: true },
      emission: { value: true },
      rotate_degrees: { value: rotation },
      opacity: { value: 1 },
      transparent_threshold: { value: 0.05 },
    },
    vertexShader: SolarVertexShader,
    fragmentShader: SolarFragmentShader,
  });
  // Enable transparency, without this, making pixels transparent will
  // just make them white.
  shader.transparent = true;
  shader.blending = AdditiveBlending;
  // Set the shader to apply to the backside, by default it only applies
  // to the front side.
  shader.side = BackSide;
  // Construct the mesh and return it.
  const backside = new Mesh(geometry, shader);
  return backside;
}

interface Offsets {
  x: number;
  y: number;
};

async function CreateEmission(texture: Texture, jp2info: JP2Info, offsets: Offsets) {
  let scale = _ComputeMeshScale(jp2info);
  // Load the backside of the mesh in parallel
  // Load the model
  let geometry = await LoadMesh(SunConfig.model_path);
  const aspect = jp2info.width / jp2info.height;

  // Create the shader, this is where the uniforms that appear
  // in the shader are set.
  let shader = new ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      scale: { value: scale },
      x_offset: { value: offsets.x },
      y_offset: { value: offsets.y },
      aspect_ratio: { value: aspect },
      backside: { value: false },
      emission: { value: true },
      opacity: { value: 1 },
      rotate_degrees: { value: jp2info.solar_rotation },
      transparent_threshold: { value: 0.05 },
    },
    vertexShader: SolarVertexShader,
    fragmentShader: SolarFragmentShader,
  });
  // Enable transparency, without this, making pixels transparent will
  // just make them white.
  shader.transparent = true;
  shader.blending = AdditiveBlending;
  // Construct the 3js mesh
  return new Mesh(geometry, shader);
}

function _ComputeOffsets(jp2info: JP2Info) {
  const offset = {
    x: jp2info.solar_center_x / jp2info.width,
    y: jp2info.solar_center_y / jp2info.height
  }
  return offset;
}

/**
 * Creates a hemisphere with the given texture applied
 * @param {Texture} texture
 * @param {JP2info} jp2 metadata about this texture for positioning
 */
async function CreateHemisphereWithTexture(texture: Texture, jp2info: JP2Info) {
  const scale = _ComputeMeshScale(jp2info);
  const offsets = _ComputeOffsets(jp2info);
  const aspect = jp2info.width / jp2info.height;
  // Load the backside of the mesh in parallel
  // Load the model
  let geometry = await LoadMesh(SunConfig.model_path);

  // Create the shader, this is where the uniforms that appear
  // in the shader are set.
  let shader = new ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      scale: { value: scale },
      aspect_ratio: { value: aspect },
      x_offset: { value: offsets.x },
      y_offset: { value: offsets.y },
      backside: { value: false },
      emission: { value: false },
      opacity: { value: 1 },
      rotate_degrees: { value: jp2info.solar_rotation },
      transparent_threshold: { value: 0.05 },
    },
    vertexShader: SolarVertexShader,
    fragmentShader: SolarFragmentShader,
  });
  // Enable transparency, without this, making pixels transparent will
  // just make them white.
  shader.transparent = true;
  shader.blending = AdditiveBlending;
  // Construct the 3js mesh
  const sphere = new Mesh(geometry, shader);
  const emission = await CreateEmission(texture, jp2info, offsets);
  const backside = await _GetBackside(texture, scale, jp2info.solar_rotation, offsets, aspect);
  // Construct the backside of the mesh
  // Add both sphere and backside models to a group, so all operations
  // to the group apply to everything inside.
  const sphere_group = new Group();
  sphere_group.add(sphere);
  sphere_group.add(emission);
  sphere_group.add(await backside);
  return sphere_group;
}

/**
 * Gets the dimensions of a flat plane according to the jp2info
 * @param {JP2Info} jp2info
 * @returns {Object} Object with width, height fields.
 */
function _getPlaneDimensionsFromJp2Info(jp2info: JP2Info) {
  let x_scale = jp2info.width / jp2info.solar_radius;
  let y_scale = jp2info.height / jp2info.solar_radius;
  let width = x_scale;
  let height = y_scale;
  return {
    width: width,
    height: height,
  };
}

async function CreatePlaneWithTexture(texture: Texture, jp2info: JP2Info) {
  let dimensions = _getPlaneDimensionsFromJp2Info(jp2info);
  const geometry = new PlaneGeometry(dimensions.width, dimensions.height);
  let shader = new ShaderMaterial({
    uniforms: {
      tex: { value: texture },
      x_offset: { value: 0.0 },
      y_offset: { value: 0.0 },
      opacity: { value: 1 },
    },
    vertexShader: LascoVertexShader,
    fragmentShader: LascoFragmentShader,
  });
  shader.transparent = true;
  shader.blending = AdditiveBlending;
  const mesh = new Mesh(geometry, shader);
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
        let dimensions = _getPlaneDimensionsFromJp2Info(jp2info);
        model.geometry.width = dimensions.width;
        model.geometry.height = dimensions.height;
        model.updateMatrix();
      } else {
        model.material.uniforms.scale.value = _ComputeMeshScale(jp2info);
      }
    }
  }
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
 * @param {Group} model Model group returned by CreateHemisphereWithTexture
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
  CreateHemisphereWithTexture,
  CreatePlaneWithTexture,
  UpdateModelTexture,
  UpdateModelOpacity,
  FreeModel,
};
