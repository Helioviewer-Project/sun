import { Group, Object3D } from "three";
import { Quality, QualitySettings } from "./quality";
import { Database, SunTextureData } from "./database";
import { CreateTextures, SunTexture } from "./texture";
import { CreateSphericalModel, UpdateModelOpacity, CreatePlaneWithTexture } from "./model_builder";
import { PLANE_SOURCES } from "./sourceinfo";

/**
 * The static sun is a sun that represents 1 image instead
 * of multiple images. It only accepts one date instead
 * of a time range.
 */
class StaticSun extends Object3D {
    // @ts-ignore
    private imageData: SunTextureData;
    // @ts-ignore
    private texture: SunTexture;
    // @ts-ignore
    private model: Group;
    private _time: Date;
    public ready: Promise<void>;
    /**
     * @param source Helioviewer observatory ID
     * @param date Time to load
     */
    constructor(source: number, date: Date, quality: QualitySettings = Quality.Maximum) {
        super();
        this._time = date;
        this.ready = new Promise(async (resolve, reject) => {
          this.imageData = await Database.GetImage(source, date, quality);
          this.texture = (await CreateTextures([this.imageData]))[0];
          this._time = this.texture.date;
          this.model = PLANE_SOURCES.indexOf(source) === -1 ?
            await CreateSphericalModel(this.texture.texture, this.imageData.jp2Metadata, this.imageData.jp2info) :
            await CreatePlaneWithTexture(this.texture.texture, this.imageData.jp2info);
          this.add(this.model);
          resolve();
        });
    }

    /**
     * Sets the model opacity to the given value
     * @param value Number between 0 and 1, 0 is transparent and 1 is opaque.
     */
    set opacity(value: number) {
        this.ready.then(() => { UpdateModelOpacity(this.model, value); })
    }

    get time() {
        return this._time;
    }
}

export { StaticSun }
