import { Helioviewer, JP2Info } from "./helioviewer.js";
import { QualitySettings, Resolution2Scale } from "./quality.js";

interface SunTextureData {
  /** ID associated with the helioviewer image */
  id: number;
  /** Time which the image texture represents */
  date: Date;
  /** Url to the image texture */
  url: string;
  /** Image metadata required for texture positioning */
  jp2info: JP2Info;
}

interface UrlInfo {
  /** Image ID */
  id: number;
  /** Image URL */
  url: string;
  /** Image timestamp */
  timestamp: Date;
  /** Image metadata */
  jp2info: JP2Info;
}

/**
 * Searches helioviewer for images to use
 */
class ImageFinder {
  /**
   * Checks if the given url is new to the list
   * @returns true if url_to_check is not in urls
   */
  static _isNewUrl(urls: UrlInfo[], url_to_check: string) {
    // Check if the url is in the list
    const found = urls.find((el) => el.url == url_to_check);
    // If found is undefined, then the url is a new url
    return found == undefined;
  }

  /**
   * Queries helioviewer for a list of images
   *
   * @param source ID for the telescope's source
   * @param start Start time of range to query
   * @param end End time of range to query
   * @param cadence Number of seconds between each image
   * @param scale Image scale of images to download
   * @param format Image format to use
   */
  static async GetImages(
    source: number,
    start: Date,
    end: Date,
    cadence: number,
    quality: QualitySettings,
  ): Promise<UrlInfo[]> {
    // Use Helioviewer API to query for image ids
    let images = await Helioviewer.QueryImages(source, start, end, cadence);
    // Iterate over image IDs and query GetImageURL to create
    // a list of URLs.
    let url_info = [];
    let scale = Resolution2Scale(quality.resolution, source);
    for (const image of images) {
      let url = Helioviewer.GetImageURL(image.id, scale, quality.format);

      // ignore duplicates
      if (ImageFinder._isNewUrl(url_info, url)) {
        url_info.push({
          id: image.id,
          url: url,
          timestamp: image.timestamp,
          jp2info: image.jp2_info,
        });
      }
    }

    // Return url list
    return url_info;
  }
}

/**
 * Interface for querying image and positional information
 */
class Database {
  /**
   * Query data sources for a list of image information
   *
   * @param {number} source Telescope source ID
   * @param {Date} start Beginning of time range to query
   * @param {Date} end End of time range to query
   * @param {number} cadence Number of seconds between each image
   * @param {number} scale Image scale that will be requested
   * @param {string} format Image format
   * @return {HeliosImage[]}
   */
  static async GetImages(
    source: number,
    start: Date,
    end: Date,
    cadence: number,
    quality: QualitySettings,
  ): Promise<SunTextureData[]> {
    // Initialize array of objects that will be returned
    let results: SunTextureData[] = [];

    try {
      // Query the images for the given time range
      let images = await ImageFinder.GetImages(
        source,
        start,
        end,
        cadence,
        quality,
      );

      // For each image, get their observer's position in space
      for (const image of images) {
        let helios_image = {
          id: image.id,
          date: image.timestamp,
          url: image.url,
          jp2info: image.jp2info,
        };
        results.push(helios_image);
      }
    } catch (e) {
      throw "Failed to load images from database";
    }

    return results;
  }
}

export { Database, SunTextureData };
