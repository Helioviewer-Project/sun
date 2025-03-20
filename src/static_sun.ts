import { Group, Object3D } from "three";
import { Quality, QualitySettings } from "./quality";
import { Database, SunTextureData } from "./database";
import { CreateTextures, SunTexture } from "./texture";
import { CreateSphericalModel } from "./model_builder";

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
    public ready: Promise<void>;
    /**
     * @param source Helioviewer observatory ID
     * @param date Time to load
     */
    constructor(source: number, date: Date, quality: QualitySettings = Quality.Maximum) {
        super();
        this.ready = new Promise(async (resolve, reject) => {
          this.imageData = await Database.GetImage(source, date, quality);
          this.texture = (await CreateTextures([this.imageData]))[0];
          this.model = await CreateSphericalModel(this.texture.texture, this.imageData.jp2Metadata)
          this.add(this.model);
        });
    }
}

export { StaticSun }
