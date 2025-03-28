/** @see https://github.com/Helioviewer-Project/JHelioviewer-SWHV/blob/3a0ad9b2c37920b937d4ea8ea4deb6d7738a06fb/src/org/helioviewer/jhv/time/JulianDay.java#L8 */
const DJM0 = 2400000.5;
/** @see https://github.com/Helioviewer-Project/JHelioviewer-SWHV/blob/3a0ad9b2c37920b937d4ea8ea4deb6d7738a06fb/src/org/helioviewer/jhv/time/JulianDay.java#L9 */
const UNIX_EPOCH_MJD = (2440587.5 - DJM0);
const RadiusKMeter = 695700; // photospheric, IAU2015 Table 4, https://doi.org/10.1007/s10569-017-9805-5
const RadiusMeter = RadiusKMeter * 1e3;
const DAY_IN_MILLIS = 86400000;
const DEG_2_RAD_FACTOR = Math.PI / 180;
const MEAN_EARTH_DISTANCE_METER = 149_597_870_700;
const MEAN_EARTH_DISTANCE_SOLRAD = MEAN_EARTH_DISTANCE_METER / RadiusMeter;

class MathUtils {
    /**
     * @see https://github.com/Helioviewer-Project/JHelioviewer-SWHV/blob/3a0ad9b2c37920b937d4ea8ea4deb6d7738a06fb/src/org/helioviewer/jhv/time/JulianDay.java#L11C5-L17C6
     */
    static milli2mjd(milli: number): number {
        return UNIX_EPOCH_MJD + milli / DAY_IN_MILLIS;
    }

    /**
     * @see https://github.com/Helioviewer-Project/JHelioviewer-SWHV/blob/3a0ad9b2c37920b937d4ea8ea4deb6d7738a06fb/src/org/helioviewer/jhv/time/JulianDay.java#L11C5-L17C6
     */
    static mjd2jcy(mjd: number, epoch: number): number {
        return (DJM0 - epoch + mjd) / 36525.;
    }

    /**
     * Returns the distance between the earth and the sun at the given time in
     * solar radii units.
     * Port of JHelioviewer's getEarthDistance
     * @see https://github.com/Helioviewer-Project/JHelioviewer-SWHV/blob/3a0ad9b2c37920b937d4ea8ea4deb6d7738a06fb/src/org/helioviewer/jhv/astronomy/Sun.java#L63
     */
    static getEarthDistance(milli: number): number {
        const mjd = this.milli2mjd(milli);
        const t = this.mjd2jcy(mjd, 2415020);

        // Geometric Mean Longitude (deg)
        // const mnl = 279.69668 + 36000.76892 * t + 0.0003025 * t * t;
        // Mean anomaly (deg)
        const mna = 358.47583 + 35999.04975 * t - 0.000150 * t * t - 0.0000033 * t * t * t;
        // Eccentricity of orbit
        const e = 0.01675104 - 0.0000418 * t - 0.000000126 * t * t;
        // Sun's equation of center (deg)
        const c = (1.919460 - 0.004789 * t - 0.000014 * t * t) * Math.sin(mna * DEG_2_RAD_FACTOR) + (0.020094 - 0.000100 * t) * Math.sin(2 * mna * DEG_2_RAD_FACTOR) + 0.000293 * Math.sin(3 * mna * DEG_2_RAD_FACTOR);
        // Sun's true geometric longitude (deg)
        // const true_long = mnl + c;
        // Sun's true anomaly (deg):
        const ta = mna + c;
        // Sun's radius vector (AU)
        const dist = 1.0000002 * (1 - e * e) / (1 + e * Math.cos(ta * DEG_2_RAD_FACTOR));

        return dist * MEAN_EARTH_DISTANCE_SOLRAD;
    }
}

export { MathUtils, RadiusMeter }
