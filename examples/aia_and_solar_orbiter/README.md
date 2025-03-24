# AIA + Solar Orbiter Demo

This is a demo of the sun module which uses images and data from the Helioviewer
API for rendering 3D images of the sun.

## How to run

```bash
# Clone the demonstration branch
git clone --branch demo https://github.com/Helioviewer-Project/sun sun_demo
# Enter the project directory
cd sun_demo
# Compile the module
npm i && npx tsc
# Optionally, run npx tsc -w in a separate terminal so that changes are
# compiled automatically
cd example/aia_and_solar_orbiter
npm i && npx vite
```

Relevant code to follow is:
- `src/model_builder.ts:CreateSphericalModel` - This is the function used
   for rendering the model in the example. It passes values to the shader
   program.
- `src/glsl/solar_shader_improved.ts` - This is the shader program being used for drawing
  the model.
- `src/HelioviewerJp2Metadata.ts` - This reads the XML JP2 Header to compute
  values to pass to the shader program. See `CreateSphericalModel` for
  how the functions are passed to the shader.
