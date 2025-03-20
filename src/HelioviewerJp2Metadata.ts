/**
 * Used for parsing XML jp2 information from Helioviewer
 */
class HelioviewerJp2Metadata {
    private xml: DOMParser;
    /**
     * @param header JP2Image header
     */
    constructor(header: string) {
        this.xml = new DOMParser();
        this.xml.parseFromString(header, "text/xml");
    }
}

export { HelioviewerJp2Metadata }
