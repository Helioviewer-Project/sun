interface QualitySettings {
  /** Desired image resolution. A value of 1024 will request a 1024x1024 image */
  resolution: number;
  /**
   * Image format to request for textures. available options are "png" and "jpg"
   * png will result in a higher quality image but will use more bandwidth.
   */
  format: string;
}

interface QualityOptions {
  Low: QualitySettings;
  Default: QualitySettings;
  High: QualitySettings;
  Maximum: QualitySettings;
}

const Quality: QualityOptions = {
  Low: {
    resolution: 512,
    format: "jpg",
  },

  Default: {
    resolution: 1024,
    format: "png",
  },

  High: {
    resolution: 2048,
    format: "png",
  },

  Maximum: {
    resolution: 4096,
    format: "png",
  },
};

type Number2Number = {
  [key: number]: number;
};

let source_resolutions: Number2Number = {
  0: 1024, // 0 - 7
  8: 4096, // 8 - 19
  20: 2048, // 20 - 27
  28: 512, // 28
  29: 2048, // 29
  30: 512, // 30
  31: 2048, // 31
  33: 512, // 33-35
  75: 1024, // 75-76
  77: 512, // 77
  78: 1024, // 78-83
};

function _GetResolutionIndex(source_id: number) {
  if (source_id < 0) {
    // This indicates something pretty bad happened.
    console.warn(
      `An error occurred getting the image scale for ${source_id}, defaulting to 1`,
    );
    return 1;
  }
  if (source_resolutions.hasOwnProperty(source_id)) {
    return source_id;
  } else {
    // Get the index for the ID below this one.
    return _GetResolutionIndex(source_id - 1);
  }
}

function _GetBaseImageResolution(source_id: number): number {
  let idx = _GetResolutionIndex(source_id);
  return source_resolutions[idx];
}

/**
 * Returns the appropriate Image Scale given a resolution choice and Source ID
 * @param {number} resolution Resolution in square pixels.
 * @param {number} source Data source ID
 */
function Resolution2Scale(resolution: number, source: number) {
  let scale = _GetBaseImageResolution(source) / resolution;
  // Clamp scale to 1. Less than 1 will apply artificial "upscaling" to the image
  // This wastes by returning a larger image with no quality improvement
  if (scale < 1) {
    scale = 1;
  }
  return scale;
}

export { Quality, QualitySettings, Resolution2Scale };
