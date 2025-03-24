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
} from "three";
import { PLANE_SOURCES } from "./sourceinfo";
import { LoadMesh } from "./mesh_loader";
import {
  vertex_shader as SolarVertexShader,
  fragment_shader as SolarFragmentShader,
} from "./glsl/solar_shaders";
import {
  vertex_shader as SolarVertexShaderImproved,
  fragment_shader as SolarFragmentShaderImproved,
  SolarShaderUniforms,
} from "./glsl/solar_shader_improved";
import {
  vertex_shader as LascoVertexShader,
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
async function _GetBackside(uniforms: SolarShaderUniforms): Promise<Mesh> {
  const uniformCopy: SolarShaderUniforms = JSON.parse(JSON.stringify(uniforms));
  uniformCopy.backside.value = true;
  let geometry = await LoadMesh(SunConfig.model_path);
  let shader = new ShaderMaterial({
    // @ts-ignore
    uniforms: uniformCopy,
    vertexShader: SolarVertexShaderImproved,
    fragmentShader: SolarFragmentShaderImproved,
  });
  shader.depthWrite = false;
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
  shader.blending = AdditiveBlending;
  return new Mesh(geometry, shader);
}

async function CreateSphericalModel(texture: Texture, jp2Meta: HelioviewerJp2Metadata, jp2info: JP2Info): Promise<Group> {
  const group = new Group();
  const uniforms = CopySphericalModelUniforms(texture, jp2Meta, jp2info);
  group.add(await _GetBackside(uniforms));
  group.add(await CreateSphericalModelMesh(uniforms));
  return group;
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
        let dimensions = _getPlaneDimensionsFromJp2Info(jp2info);
        model.geometry.width = dimensions.width;
        model.geometry.height = dimensions.height;
        model.updateMatrix();
      } else {
        CopySphericalModelUniforms(texture, jp2Meta, jp2info, model.material.uniforms);
      }
    }
  }
}

/**
 * Copies values into the given uniforms target.
 *
 * setting model.material.uniforms = {new object} does not work. Something
 * due to object references, so this function copies everything over.
 * @param uniforms Target uniforms object
 * @param tex New texture
 * @param jp2Meta New jp2 metadata
 * @param jp2info New jp2 information
 */
function CopySphericalModelUniforms(tex: Texture, jp2Meta: HelioviewerJp2Metadata, jp2info: JP2Info, uniforms: SolarShaderUniforms | undefined = undefined): SolarShaderUniforms {
  if (typeof uniforms === "undefined") {
    // @ts-ignore
    uniforms = {
      opacity: { value: 1.0 },
      backside: { value: false }
    };
  }
  // @ts-ignore
  uniforms.tex = { value: tex },
  // @ts-ignore
  uniforms.aspect = { value: jp2Meta.width() / jp2Meta.height() },
  // @ts-ignore
  uniforms.scale = { value: jp2Meta.scale() },
  // @ts-ignore
  uniforms.x_offset = { value: jp2Meta.glOffsetX() },
  // @ts-ignore
  uniforms.y_offset = { value: jp2Meta.glOffsetY() },
  // @ts-ignore
  uniforms.center_of_rotation = { value: jp2Meta.centerOfRotation() },
  // @ts-ignore
  uniforms.rotate_degrees = { value: jp2info.solar_rotation }
  // @ts-ignore
  return uniforms;
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
