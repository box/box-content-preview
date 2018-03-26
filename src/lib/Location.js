class Location {
    /**
     * Returns window hostname to simplify testing.
     *
     * @return {string} Window hostname
     */
    static getHostname() {
        return window.location.hostname || '';
    }

    /**
     * Returns window origin to simplify testing.
     *
     * @return {string} Window location
     */
    static getOrigin() {
        return window.location.origin || '';
    }
}

export default Location;
