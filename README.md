# Sun

This module implements observations from the sun as an Object3D model which can
be used in a three.js project.

## Installation

```bash
npm i @helioviewer/sun
npx hvsun-install "<install directory>"
```

`hvsun-install` will copy the required 3D model to the given location. This
model is required to render the sun.

By default, when you create a new instance of a sun, it will search for the model at `resources/models/sun_model.gltf`.
If you install the models to a different directory, then you can specify the new location in your app via:

```js
import { SunConfig } from "@helioviewer/sun";
SunConfig.model_path = "path/to/model.gltf";
```

Basic Usage:

```js
// Get start of desired time range
let yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

// Get end of desired time range
let today = new Date();

// Construct the sun object
// 13 => AIA 304
// 86400 => Query images that are 1 day apart (86400 seconds = 1 day)
// renderer.initTexture is optional, if provided, it will preload all textures to the GPU.
let sun = new Sun(
  13,
  yesterday,
  today,
  86400,
  Quality.Low,
  renderer.initTexture,
);
// Add the sun to the scene
renderer.scene.add(sun);
sun.position.set(0, 0, 0);
```

The above code will add a model of the sun to the scene.
It queries [Helioviewer](https://helioviewer.org) for the image data to use as textures.

By default, the radius of the sun is 1 three.js unit.

# Timezones

One thing to be aware of while using this module is that only the native
javascript date type is used, but all data indexed via UTC time.

When you create a date object with `new Date()`, it returns an object
with the current local time. When this date is used to create a sun instance,
this module will call `.toISOString()` to get the UTC time for that date.
This will convert the local time to a UTC time based on your current timezone.
This may lead to unexpected behavior if your users are in different time zones
or if your application doesn't provide the expected date.
