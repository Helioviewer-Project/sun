import { Texture } from "three";
import { JP2Info } from "./helioviewer";
import { SunTextureData } from "./database";

interface SunTexture {
  /** ID for this helioviewer image */
  id: number;
  /** Date of the image texture */
  date: Date;
  /** Three texture */
  texture: Texture;
  /** Image metadata */
  jp2info: JP2Info;
  jp2Metadata: HelioviewerJp2Metadata;
}

import { TextureLoader } from "three";
import { HelioviewerJp2Metadata } from "./HelioviewerJp2Metadata";

/**
 * Keep one texture loader initialized.
 * @private
 */
let loader = new TextureLoader();

/**
 * Asynchronously loads a url into a 3js texture
 * @param url URL to the image to be loaded as a texture
 */
function LoadTexture(url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      // on success
      (texture) => resolve(texture),
      // onProgress is not supported by threejs
      undefined,
      // on error
      (result) => reject(result),
    );
  });
}

/**
 * Uses 3js to create textures out of image data
 * @private
 *
 * @param images data to create textures from
 * @param gpu_load_texture Function to initialize the texture on the GPU.
 * @returns Texture data for models to use
 */
async function CreateTextures(
  images: SunTextureData[],
  gpu_load_texture?: (texture: Texture) => void,
): Promise<SunTexture[]> {
  let result: SunTexture[] = [];
  // LoadTexture is async, so this first iteration
  // fires off the load texture requests
  for (const image of images) {
    let texture = LoadTexture(image.url);
    result.push({
      id: image.id,
      date: image.date,
      texture: texture as any,
      jp2info: image.jp2info,
      jp2Metadata: image.jp2Metadata
    });
  }

  // Wait for async calls to complete.
  for (const image of result) {
    image.texture = await image.texture;
    if (gpu_load_texture) {
      gpu_load_texture(image.texture);
    }
  }
  return result;
}

export { CreateTextures, SunTexture };
