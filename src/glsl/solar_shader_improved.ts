/**
 * A vertex shader in the graphics pipeline determines
 * where each vertex should be placed in 3D space. It is executed for each vertex in a 3D model (mesh).
 * This shader is based on threejs's MeshBasicMaterial shader.
 * The only modification is the addition of texCoord for passing to the fragment shader.
 */
let vertex_shader = `
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 v_uv;
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
	v_uv = uv;
}`;

/**
 * The fragment shader (or pixel shader) runs for every pixel that should be rendered on a mesh.
 * It uses UV coordinates (uv is denotes the xy axes, but xy is not used because they're already
 * used to describe the axes in a 3D model). UV coordinates are 2 dimensional coordinates that map
 * to a point in a 3D model.
 *
 * UV coordinates are passed in a range from 0 to 1. (0,0) being the bottom left corner and (1,1)
 * being the uppermost right corner. The 3D model itself defines how these coordinates map to 3D space.
 * See uv_map.png in the resources/models folder.
 * @private
 */
let fragment_shader = `
/* uniforms are global variables that can be passed to this shader program via 3js. */

// tex is the 3D texture, in this case the image of the sun we are mapping to the model
uniform sampler2D tex;

// CRVAL computed for use in the shader from the image metadata
uniform vec2 CRVAL;

// Rotation quaternion generated from CROTA in image metadata
uniform vec4 CROTA;

uniform float aspect;
uniform float scale;
uniform float x_offset;
uniform float y_offset;
uniform float rotate_degrees;
uniform vec2 center_of_rotation;

// texcoord is the uv we're working on, received from the vertex shader.
// varying means it is a variable coming from the vertex shader.
// as opposed to uniform, which means it is a global constant.
varying vec2 v_uv;

uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {
    vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

	// This scales the image to the appropriate size so that emission is off the main hemisphere.
	vec2 final_uv = v_uv;
	final_uv -= vec2(0.5);
	final_uv /= scale;
	// Apply aspect ratio to image
	if (aspect > 1.0) {
		final_uv.x = final_uv.x / aspect;
	} else {
		final_uv.y = final_uv.y * aspect;
	}

	// Apply helioviewer shift.
	final_uv.x += x_offset;
	final_uv.y += y_offset;

	// Apply rotation to the image
	float rotation_rad = radians(rotate_degrees);
	vec2 center = center_of_rotation;
	vec2 centered_uv = final_uv - center;
	mat2 rotation_matrix = mat2(cos(rotation_rad), -sin(rotation_rad), sin(rotation_rad), cos(rotation_rad));
	final_uv = rotation_matrix * centered_uv + center;

	if (final_uv.x < 0.0 || final_uv. y < 0.0 || final_uv.x > 1.0 || final_uv.y > 1.0) {
		discard;
	}

    vec4 color = vec4(texture2D(tex, final_uv).rgb, opacity);

    // Update the output color to what we've calculated above.
	gl_FragColor = color;
}`;

export { vertex_shader, fragment_shader };
