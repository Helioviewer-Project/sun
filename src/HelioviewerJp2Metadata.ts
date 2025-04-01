import { MathUtils, RadiusMeter } from "./math/MathUtils";

/**
 * Used for parsing XML jp2 information from Helioviewer
 */
class HelioviewerJp2Metadata {
    private xml: XMLDocument;
    /** Optional date override to use instead of attempting to parse from metadata */
    private _date: Date | undefined;
    /**
     * @param header JP2Image header
     * @param date If set, use this date instead of reading from metadata
     */
    constructor(header: string, date?: Date) {
        const parser = new DOMParser();
        this.xml = parser.parseFromString(header, "text/xml");
        this._date = date;
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
        // Use date override if it is set.
        // This was simpler than trying to handle different FITS
        // keys to correctly get the date since helioviewer already does this.
        // It may be implemented in the future.
        if (typeof this._date !== undefined) {
            return this._date as Date;
        }

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
                const out = this.getNumberOrDie("CDELT1") * this.radiusInPixels()
                return out;
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
     * Convert arcseconds to solar radius units
     * @param arcsec Unit in arcseconds
     * @returns The distance in solar radii
     */
    arcsec2Solrad(arcsec: number): number {
        return arcsec / this.radiusInArcsec();
    }

    /**
     * Convert pixel coordinates to arcseconds
     * @param pixel The pixel coordinate to convert
     * @param refPix The reference pixel (CRPIX)
     * @param refVal The reference value (CRVAL)
     * @param delta The pixel scale (CDELT)
     * @returns The coordinate in arcseconds
     */
    pixel2arcsec(pixel: number, refPix: number, refVal: number, delta: number) {
        return (pixel - refPix) * delta + refVal;
    }

    /**
     * Convert pixel coordinates to solar radius units
     * @param pixel The pixel coordinate to convert
     * @param refPix The reference pixel (CRPIX)
     * @param refVal The reference value (CRVAL)
     * @param delta The pixel scale (CDELT)
     * @returns The coordinate in solar radii
     */
    pixel2solrad(pixel: number, refPix: number, refVal: number, delta: number): number {
        const arcsec = this.pixel2arcsec(pixel, refPix, refVal, delta);
        return this.arcsec2Solrad(arcsec);
    }

    /**
     * Computes the amount to move the entire model to account for WCS information.
     * This is different than only moving the image to align with a model.
     */
    sceneOffsetX(): number {
        const ref = this.getNumberOrDie("CRPIX1") - 0.5;
        const crval = this.getNumberOrDie("CRVAL1");
        const cdelt = this.getNumberOrDie("CDELT1");
        // Get the current position of the reference pixel in scene units
        // This is done by assuming the center of the image (this.width()) is
        // by default at the center of the scene (reference value 0).
        const currentPos = this.pixel2solrad(ref, this.width() / 2, 0, cdelt);
        // Get the target position of the reference pixel in scene units
        // This is where it ought to be, computed using normal info from header.
        const targetPos = this.pixel2solrad(ref, ref, crval, cdelt);
        return targetPos - currentPos;
    }

    sceneOffsetY(): number {
        const ref = this.getNumberOrDie("CRPIX2") - 0.5;
        const crval = this.getNumberOrDie("CRVAL2");
        const cdelt = this.getNumberOrDie("CDELT2");
        // Get the current position of the reference pixel in scene units
        // This is done by assuming the center of the image (this.width()) is
        // by default at the center of the scene (reference value 0).
        const currentPos = this.pixel2solrad(ref, this.width() / 2, 0, cdelt);
        // Get the target position of the reference pixel in scene units
        // This is where it ought to be, computed using normal info from header.
        const targetPos = this.pixel2solrad(ref, ref, crval, cdelt);
        return targetPos - currentPos;
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
