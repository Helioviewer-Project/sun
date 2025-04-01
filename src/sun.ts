import { Object3D, Group } from "three";
import { QualitySettings } from "./quality";
import { Database } from "./database";
import * as THREE from "three";
import { CreateTextures, SunTexture } from "./texture";
import {
  CreatePlaneWithTexture,
  UpdateModelTexture,
  UpdateModelOpacity,
  FreeModel,
  CreateSphericalModel,
} from "./model_builder";
import { PLANE_SOURCES } from "./sourceinfo";

interface DateRange {
  start: Date;
  end: Date;
}

interface ImageInfo {
  id: number;
  date: Date;
}

type SetTimeCallback = (date: Date) => void;

class Sun extends Object3D {
  private _model?: Group;
  private _data: SunTexture[] = [];
  private _time: Date = new Date();
  public get time(): Date {
    return new Date(this._time);
  }
  public ready: Promise<void>;
  public readonly source: number;
  private _selected: ImageInfo = { id: 0, date: new Date() };
  get selected(): ImageInfo {
    return this._selected;
  }
  /**
   * Create a sun object based on the given parameters
   * The parameters given determine the data that is downloaded and cached.
   * Image data may or may not be available for the time range, but the upstream
   * API makes a best-effort to get the nearest data. For example, if you request
   * data in the future, the nearest available data will likely be from today,
   * and that's what will be cached.
   * @param source Observatory source ID. See https://api.helioviewer.org/docs/v2/appendix/data_sources.html for details
   * @param start Start of time range. toISOString() will be used in the data request
   * @param end End of time range. toISOString()
   * @param cadence Time delay between each requested frame in seconds
   * @param quality Image quality settings
   * @param gpu_load_texture Optionally provide in WebGLRenderer.initTexture to preload the textures. This will prevent stuttering during animation, but may cause stuttering during construction.
   */
  constructor(
    source: number,
    start: Date,
    end: Date,
    cadence: number,
    quality: QualitySettings,
    gpu_load_texture?: (texture: THREE.Texture) => void,
  ) {
    super();

    this.source = source;
    this.ready = new Promise((resolve, reject) => {
      Database.GetImages(source, start, end, cadence, quality)
        .then((data) => CreateTextures(data, gpu_load_texture))
        .then(this._InitializeModel.bind(this))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Constructs a 3js model for rendering
   * @private
   */
  private async _InitializeModel(textures: SunTexture[]) {
    this._data = textures;
    if (PLANE_SOURCES.indexOf(this.source) != -1) {
      this._model = await CreatePlaneWithTexture(
        this._data[0].texture,
        this._data[0].jp2Metadata,
        this._data[0].jp2info,
      );
    } else {
      this._model = await CreateSphericalModel(
        this._data[0].texture,
        this._data[0].jp2Metadata,
        this._data[0].jp2info,
      );
    }

    // Add the sun model to this Object3D so it is visible when
    // when added to the scene.
    this.add(this._model);

    // Update the texture/rotational position
    await this._Update(this._time);
  }

  /**
   * Searches the object's data for the data point closest to the given date
   * @param {Date} date The date to find in the image list
   * @private
   */
  private _GetDataFromDate(date: Date): SunTexture | null {
    if (this._data.length == 0) {
      return null;
    }

    let chosen_index = 0;
    let dt = Math.abs(date.getTime() - this._data[0].date.getTime());
    // To choose the nearest date, iterate over all dates and select
    // the one with the lowest time delta from the given date
    // Start at 1 since 0 was already set above.
    for (let i = 1; i < this._data.length; i++) {
      const stored_date = this._data[i].date.getTime();

      let delta = Math.abs(date.getTime() - stored_date);
      // If the time difference is smaller than the stored time difference,
      // then update to that date.
      if (delta < dt) {
        chosen_index = i;
        dt = delta;
      }
    }
    return this._data[chosen_index];
  }

  /**
   * Updates the current texture for the current time
   * on the current time
   */
  private async _Update(date: Date) {
    let data = this._GetDataFromDate(date);
    this._selected = { id: data?.id || 0, date: data?.date || new Date() };
    // No data has been assigned to this model, so do nothing.
    if (data == null) {
      return;
    }

    this._time = data.date;
    // Get the texture to use from the current time.
    let texture = data.texture;

    // Update the texture on the model to the date's texture
    if (this._model) {
      UpdateModelTexture(this._model, texture, data.jp2info, data.jp2Metadata, this.source);
    }
  }

  private _GetRange(): DateRange {
    if (this._data.length > 0) {
      return {
        start: this._data[0].date,
        end: this._data[this._data.length - 1].date,
      };
    } else {
      let now = new Date();
      return { start: now, end: now };
    }
  }

  get info(): ImageInfo[] {
    return this._data.map((info) => {
      return {
        id: info.id,
        date: info.date,
      };
    });
  }

  /** Gets the start and end dates associated with this sun */
  get range(): DateRange {
    return this._GetRange();
  }

  /** The number of frames associated with this sun. */
  get count(): number {
    return this._data.length;
  }

  /**
   * Sets the model opacity to the given value
   * @param value Number between 0 and 1, 0 is transparent and 1 is opaque.
   */
  set opacity(value: number) {
    this.ready.then(() => { UpdateModelOpacity(this._model, value); })
  }

  /**
   * Updates the sun's texture to the texture closest to the given time.
   * @note The data available depends both on the data requested in the constructor,
   *       and the data that's actually available upstream. This function sets
   *       the texture to the nearest texture that was loaded, which may or may not
   *       actually be close to the desired time.
   * @param date Time to update the model to.
   * @param callback Optional callback called with the actual time that is set.
   */
  SetTime(date: Date, callback?: SetTimeCallback) {
    this._time = date;
    this._Update(date).then(() => {
      if (callback) {
        callback(this._time);
      }
    });
  }

  /** Destroys this model and releases the underlying three resources */
  dispose() {
    this.ready.then(() => {
      FreeModel(this._model as Object3D);
    });
  }
}

export { Sun };
