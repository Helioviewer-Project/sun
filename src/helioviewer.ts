import { HelioviewerJp2Metadata } from "./HelioviewerJp2Metadata";

interface JP2Info {
  /** Time the image was observed */
  timestamp: Date;
  /** Original jp2 image width */
  width: number;
  /** Original jp2 image height */
  height: number;
  /** x coordinate of the center of the sun within the jp2 */
  solar_center_x: number;
  /** y coordinate of the center of the sun within the jp2 */
  solar_center_y: number;
  /** x offset */
  offset_x: number;
  /** y offset */
  offset_y: number;
  /** Rotation that needs to be applied to the image */
  solar_rotation: number;
  /** Radius of the sun in pixels */
  solar_radius: number;
}

interface ImageInfo {
  /** Image ID */
  id: number;
  /** Image Date */
  timestamp: Date;
  /** Image metadata */
  jp2_info: JP2Info;
}

/**
 * Converts a localized date (From flatpickr) to a UTC time.
 * Dates are returned in local time, but the datepicker is meant for UTC time.
 * So for example when I (US/Eastern) choose 12:00PM UTC, I am returned 12:00PM Eastern (which is 8am UTC, which is not what I intended to select);
 * This function applies the time zome offset to convert that 12:00PM Eastern into 12:00PM UTC.
 * The function is generic and works for all time zones.
 * @param {Date} date
 */
function ToUTCDate(date: Date): Date {
  let date_copy = new Date(date);
  date_copy.setMinutes(date_copy.getMinutes() - date.getTimezoneOffset());
  return date_copy;
}

function parseDate(datestr: string): Date {
  let numbers: any = datestr.split(/[^0-9]/);
  numbers = numbers.map((numstr: string): number => parseInt(numstr));
  // Creating a date this way uses local time, but values are UTC, so offset needs to be applied
  let localdate = new Date(
    numbers[0],
    numbers[1] - 1,
    numbers[2],
    numbers[3],
    numbers[4],
    numbers[5],
  );
  return ToUTCDate(localdate);
}

class Helioviewer {
  static api: string = "https://api.helioviewer.org?action=";

  /**
   *
   * @param url
   */
  static SetApiUrl(url: string): void {
    Helioviewer.api = url;
  }

  /**
   * Gets the API URL used for making requests
   *
   * @returns {string} URL
   */
  static GetApiUrl(): string {
    return Helioviewer.api;
  }
  /**
   * Returns a list of Image IDs for the specified time range
   *
   * @param {number} source The desired telescope's source Id
   * @param {Date} start Beginning of time range to get images for
   * @param {Date} end End of time range to get images for
   * @param {number} cadence Number of seconds between each image
   */
  static async QueryImages(
    source: number,
    start: Date,
    end: Date,
    cadence: number,
  ): Promise<ImageInfo[]> {
    let query_time = new Date(start);
    let promises: Promise<ImageInfo>[] = [];

    // Iterate over the time range, adding "cadence" for each iteration
    while (query_time <= end) {
      // Query Helioviewer for the closest image to the given time.
      // Sends the request off and store the promise
      let image_promise = Helioviewer.GetClosestImage(
        source,
        new Date(query_time),
      );
      // Add the result to the output array
      promises.push(image_promise);
      // Add cadence to the query time
      // A neat trick for setSeconds is if seconds > 60, it proceeds to update
      // the minutes, hours, etc.
      query_time.setSeconds(query_time.getSeconds() + cadence);
      // Prevent an infinite loop in the case that cadence is 0.
      // This occurs when start time = end time
      if (cadence == 0) {
        break;
      }
    }

    return Promise.all(promises);
  }

  /**
   * Queries the helioviewer API for the image nearest to the given time.
   * @param {number} source Telescope source ID
   * @param {Date} time Timestamp to query
   * @returns {ImageInfo}
   * @private
   */
  static async GetClosestImage(
    source: number,
    time: Date,
  ): Promise<ImageInfo> {
    let api_url =
      Helioviewer.GetApiUrl() +
      "getClosestImage&sourceId=" +
      source +
      "&date=" +
      time.toISOString();
    let result = await fetch(api_url);
    let image = await result.json();
    // Add the Z to indicate the date is a UTC date. Helioviewer works in UTC
    // but doesn't use the formal specification for it.
    const date = parseDate(image.date);
    return {
      id: image.id,
      timestamp: date,
      jp2_info: {
        timestamp: date,
        width: image.width,
        height: image.height,
        solar_center_x: image.refPixelX,
        solar_center_y: image.refPixelY,
        offset_x: image.offsetX,
        offset_y: image.offsetY,
        solar_rotation: image.rotation,
        solar_radius: image.rsun,
      },
    };
  }

  /**
   * Get the JP2 image header
   * @param id JP2 Image ID
   * @returns {HelioviewerJp2Metadata} parsed XML object
   */
  static async GetJp2Header(id: number, timestamp?: Date): Promise<HelioviewerJp2Metadata> {
    const url = Helioviewer.GetApiUrl() + "getJP2Header&id=" + id;
    let result = await fetch(url);
    return new HelioviewerJp2Metadata(await result.text(), timestamp);
  }

  /**
   * Returns a URL that will return a PNG of the given image
   *
   * @param {number} id The ID of the image to get
   * @param {number} scale The image scale to request in the URL
   * @param {string} format Image format (png, jpg, or webp)
   * @returns {string} URL of the image
   */
  static GetImageURL(id: number, scale: number, format = "jpg"): string {
    let url =
      Helioviewer.GetApiUrl() +
      "downloadImage&id=" +
      id +
      "&scale=" +
      scale +
      "&type=" +
      format;
    return url;
  }
}

function SetHelioviewerApiUrl(url: string) {
  Helioviewer.SetApiUrl(url);
}

export { Helioviewer, JP2Info, SetHelioviewerApiUrl };
