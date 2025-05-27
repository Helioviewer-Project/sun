# Advanced Render Techniques

One problem I continuously run into is when you wish to show multiple different
wavelengths of the sun overlayed on top of each other. In typical graphics
rendering, there is a depth buffer which holds information about what has
been previously rendered. This depth buffer is used to determine when an object
is in front or behind so that the object (or pixel) in the back is not rendered.

This poses a difficult problem to solve because the sun does not move, but we
wish to show multiple images which are guaranteed to share the same space.

This demo provides an example of how we solved this problem, which may or may
not be the optimal solution.

## How to run

```bash
# Clone the demonstration branch
git clone https://github.com/Helioviewer-Project/sun
# Enter the project directory
cd sun
# Compile the module
npm i && npx tsc
# Optionally, run npx tsc -w in a separate terminal so that changes are
# compiled automatically
cd example/render_techniques
npm i && npx vite
```

Relevant code to follow is:
- `src/main.js` - Review the render loop on how we manage the depth buffer
  to make sure all overlapping images are displayed correctly
