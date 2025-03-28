import { MathUtils, RadiusMeter } from "./math/MathUtils";

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



    getSolarRadiusFactor(): number {
        return 1;
    }

    /**
     * Retrieves the radius of the sun in pixels according to the jp2 metadata.
     */
    radiusInPixels() {
        return this.getNumberOrDie("SOLAR_R");
    }

    date(): Date {
        const dateStr = this.get("DATE_OBS", "");
        if (dateStr === "") {
            throw "Missing DATE_OBS";
        }
        return new Date(`${dateStr}Z`);
    }

    /**
     * returns the radius of the sun in arcseconds calculated according to the
     * observatory's distance from the sun.
     */
    radiusInArcsec() {
        try {
            // Attempt to compute the radius using the distance to the sun.
            // This may fail if some variation of DSUN is not available in the
            // JP2 Header
            const out = this.toDegrees(Math.atan2(this.getSolarRadiusFactor(), this.distanceToSun())) * 3600;
            return out;
        } catch (e) {
            try {
                // If DSUN is not available, distanceToSun will fail, in that case
                // try to calculate it using the radius in pixels.
                return this.getNumberOrDie("CDELT1") * this.radiusInPixels()
            } catch (e) {
                // If there no SOLAR_R/RSUN value then radiusInPixels will fail.
                // For this case just assume rsun at 1 AU
                const earthDistance = MathUtils.getEarthDistance(this.date().getTime());
                const out = this.toDegrees(Math.atan2(this.getSolarRadiusFactor(), earthDistance)) * 3600;
                return out;
            }
        }
    }

    /**
     * Returns the distance to the sun in solar radii units.
     */
    distanceToSun(): number {
        let dsun = this.getNumber("DSUN_OBS", 0);
        if (dsun === 0) dsun = this.getNumberOrDie("DSUN");
        return  dsun / RadiusMeter;
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
        return shortEdge / (4 * rsun_px);
    }

    /**
     * Compute the openGL offset along the Y axis
     */
    glOffsetY() {
        const ref = this.getNumberOrDie("CRPIX2") - 0.5;
        const crval = this.getNumberOrDie("CRVAL2");
        const cdelt = this.getNumberOrDie("CDELT2");
        const px = crval / cdelt / this.height();
        return (ref) / this.height() - px;
    }

    /**
     * Compute the openGL offset along the X axis
     */
    glOffsetX() {
        const ref = this.getNumberOrDie("CRPIX1") - 0.5;
        const crval = this.getNumberOrDie("CRVAL1");
        const cdelt = this.getNumberOrDie("CDELT1");
        const px = crval / cdelt / this.width();
        return ref / this.width() - px;
    }

    centerOfRotation() {
        const xcen = this.getNumberOrDie("CRPIX1") - 0.5;
        const ycen = this.getNumberOrDie("CRPIX2") - 0.5;
        return [xcen / this.width(), ycen / this.height()];
    }

    /**
     * Returns the value of the given tag or else the default Value if the
     * tag can't be found
     * @param tag
     * @param defaultValue
     */
    private get(tag: string, defaultValue: any): string {
        const tags = this.xml.getElementsByTagName(tag);
        if (tags.length === 0) {
            console.warn(`Couldn't find ${tag}, using default value ${defaultValue}`);
            return defaultValue;
        }
        console.assert(tags[0].textContent != null);
        return tags[0].textContent as string;
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
