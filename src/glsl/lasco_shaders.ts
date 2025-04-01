/**
 * A vertex shader in the graphics pipeline determines
 * where each vertex should be placed in 3D space. It is executed for each vertex in a 3D model (mesh).
 * gl_Position is the output variable that has the vertex's position
 * position is the initial position of the vertex.
 * There's nothing special about this vertex shader.
 * This is the default function to position the mesh in the scene.
 * The projectionMatrix and modelViewMatrix are defined by 3js and this formula
 * positions the mesh in the scene wherever it's supposed to be according to the camera position.
 * @private
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
// v_uv is used to pass the vertex information on to the fragment shader
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
    // uv is a global passed to the vertex shader, not sure why it's not passed automatically
    // to the fragment shader, where I actually need it.
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

// currently unused, can be used to shift the texture in the x axis
uniform float x_offset;

// currently unused, can be used to shift the texture in the y axis
uniform float y_offset;

// v_uv is the uv we're working on, received from the vertex shader.
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
	gl_FragColor = vec4(texture2D(tex, v_uv).rgb, opacity);

// 	vec2 tex_coord = vec2(v_uv.x + x_offset, v_uv.y + y_offset);
//     if (tex_coord.x > 1.0 || tex_coord.y > 1.0 || tex_coord.x < 0.0 || tex_coord.y < 0.0) {
//         discard;
//     }
//
//     // Get the color of this coordinate in the texture
//     vec4 color = vec4(texture2D(tex, tex_coord).rgb, opacity);
//
//     // Black is vec3(0, 0, 0) all values are from 0 to 1.
//     // x, y, z -> red, green, blue
//     // If all three color values are below this threshold, then make them transparent.
//     // then change the color to transparent. If any color is above the threshold, then don't change it
//     // use the color sampled from the texture.
//     float transparent_threshold = 0.01f;
//     bool should_be_transparent = color.x < transparent_threshold && color.y < transparent_threshold && color.z < transparent_threshold;
//     if (should_be_transparent) {
//         discard;
//     }
//
//     // Update the output color to what we've calculated above.
// 	gl_FragColor = color;
}`;

export { vertex_shader, fragment_shader };
