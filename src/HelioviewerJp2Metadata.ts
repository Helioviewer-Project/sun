import { Quaternion, Vector3 } from "three";
const SUN_RADIUS = 0.25;
const RadiusKMeter = 695700; // photospheric, IAU2015 Table 4, https://doi.org/10.1007/s10569-017-9805-5
const RadiusMeter = RadiusKMeter * 1e3;

/**
 * Used for parsing XML jp2 information from Helioviewer
 */
class HelioviewerJp2Metadata {
    private xml: XMLDocument;
    /**
     * @param header JP2Image header
     */
    constructor(header: string) {
        const parser = new DOMParser();
        this.xml = parser.parseFromString(header, "text/xml");
    }

    /**
     * returns the radius of the sun in arcseconds calculated according to the
     * observatory's distance from the sun.
     */
    radiusInArcsec() {
        const val = this.toDegrees(Math.atan2(1, this.distanceToSun())) * 3600;
        console.log("Radius in arcsec: ", val);
        return val;
    }

    /**
     * @returns OpenGL units per arcsecond
     */
    unitPerArcsec() {
        const radiusSunInArcsec = this.radiusInArcsec();
        return SUN_RADIUS / radiusSunInArcsec;
    }

    /**
     * Returns the distance to the sun in solar radii units.
     */
    distanceToSun(): number {
        return this.getNumberOrDie("DSUN_OBS") / RadiusMeter;
    }

    toDegrees(angle: number) {
        return angle * 180 / Math.PI;
    }

    toRadians(angle: number) {
        return angle * Math.PI / 180;
    }

    width(): number {
        const w = this.getNumber("NAXIS1", 0);
        if (w === 0) {
            throw "Invalid Image, missing NAXIS1";
        }
        return w;
    }

    height(): number {
        const h = this.getNumber("NAXIS2", 0);
        if (h === 0) {
            throw "Invalid Image, missing NAXIS2";
        }
        return h;
    }

    /**
     * Compute the scale according to the distance to the sun.
     * Helioviewer's given R_SUN can't be trusted to do this accurately.
     * It computes a value that may work for Helioviewer.org, but not for
     * the accuracy that we need in this application.
     */
    scale(): number {
        // Assume cdelt1 and cdelt2 are the same.
        const arcsecPerPixel = this.getNumberOrDie("CDELT1");
        const rsun_px = this.radiusInArcsec()  / arcsecPerPixel;
        const shortEdge = Math.min(this.width(), this.height());
        const val = shortEdge / (4 * rsun_px);
        console.log("Computed scale: ", val);
        console.log(this.radiusInArcsec() * this.unitPerArcsec())
        return val;
    }

    /**
     * Compute the openGL unit offset given the helioviewer offset
     * @param hv_offset
     */
    offset(hv_offset: number) {
        const shortEdge = Math.min(this.width(), this.height());
        return (hv_offset - 0.5) / shortEdge;
    }

    /**
     * Compute the openGL offset along the Y axis
     */
    glOffsetY() {
        const shortEdge = Math.min(this.width(), this.height());
        const ref = this.getNumberOrDie("CRPIX2");
        return (ref) / shortEdge - (this.getNumberOrDie("CRVAL2") * this.unitPerArcsec());
    }

    /**
     * Compute the openGL offset along the X axis
     */
    glOffsetX() {
        const shortEdge = Math.min(this.width(), this.height());
        const ref = this.getNumberOrDie("CRPIX1");
        return (ref) / shortEdge - (this.getNumberOrDie("CRVAL1") * this.unitPerArcsec());
    }

    /**
     * Returns the value of the given tag or else the default Value if the
     * tag can't be found
     * @param tag
     * @param defaultValue
     */
    private get(tag: string, defaultValue: any) {
        const tags = this.xml.getElementsByTagName(tag);
        if (tags.length === 0) {
            console.warn(`Couldn't find ${tag}, using default value ${defaultValue}`);
            return defaultValue;
        }
        return tags[0].textContent;
    }

    /**
     * Returns the numeric value of the given tag or else the default Value if the
     * tag can't be found
     * @param tag
     * @param defaultValue
     */
    private getNumber(tag: string, defaultValue: number): number {
        const val = parseFloat(this.get(tag, defaultValue));
        return isNaN(val) ? defaultValue : val;
    }

    /**
     * Returns the numeric value of the given tag or else the default Value if the
     * tag can't be found
     * @param tag
     * @param defaultValue
     */
    private getNumberOrDie(tag: string): number {
        const val = parseFloat(this.get(tag, "Invalid"));
        if (isNaN(val)) {
            throw "Invalid header, missing tag " + tag;
        }
        return val;
    }
}

export { HelioviewerJp2Metadata }
