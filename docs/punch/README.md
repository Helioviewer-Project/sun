# AIA + PUNCH Demo

This is a demo of the sun module which uses images and data from the Helioviewer
API for rendering 3D images of the sun.

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
cd example/punch
npm i && npx vite
```
