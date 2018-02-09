/**
 * General purpose time recording tool
 */
class Timer {
    /** @property {Object} - Dictionary of time objects. Used to track times. tag: { start, end, elapsed } */
    times = {};

    /**
     * Create a new time structure at a given key (tag) in the 'times' object.
     *
     * @param {string} tag - The tag for the new time structure.
     * @return {Object} The newly created structure, inserted into the 'times' object, as key: tag
     */
    create(tag) {
        const time = {
            start: undefined,
            end: undefined,
            elapsed: undefined
        };

        this.times[tag] = time;
        return time;
    }

    /**
     * Start running a timer, for a tag. If a tag has already been started, then this does nothing.
     *
     * @param {string} tag - Time structure to look up, at this string. Creates a new one if none exists.
     * @return {void}
     */
    start(tag) {
        let time = this.get(tag);
        if (!time) {
            time = this.create(tag);
        }

        // Can't start a timer that's already started
        if (time.start) {
            return;
        }

        time.start = global.performance.now();
        time.end = undefined;
        time.elapsed = undefined;
    }

    /**
     * Stop the timer from running, for a tag, and calculate elapsed time. If a tag has never been started, or has already
     * been stopped, this does nothing.
     *
     * @param {string} tag - Time structure to look up, at this string.
     * @return {void}
     */
    stop(tag) {
        const time = this.get(tag);
        // The timer has already been stopped, or hasn't started. Don't stop it again.
        if (!time || time.start === undefined || time.end !== undefined) {
            return;
        }

        time.end = global.performance.now();
        time.elapsed = time.end - time.start;
    }

    /**
     * Get the time object at a given tag.
     *
     * @param {string} tag - The tag to get the time structure for.
     * @return {Object} The time structure, or undefined if none with that tag.
     */
    get(tag) {
        return this.times[tag];
    }

    /**
     * Resets the values in a certain time structure, if it exists.
     *
     * @param {string} [tag] - If provided, will reset a specific time structure associated with the tag.
     *                         If empty, resets everything.
     * @return {void}
     */
    reset(tag) {
        if (tag) {
            const time = this.get(tag);
            // We don't need to clean up nothin'
            if (!time) {
                return;
            }

            time.start = undefined;
            time.end = undefined;
            time.elapsed = undefined;
        } else {
            Object.keys(this.times).forEach((timeTag) => {
                this.reset(timeTag);
            });
        }
    }

    /**
     * Creates a tag string given a file id and event name.
     *
     * @param {string} fileId - A file id for the file.
     * @param {string} name - A name for the tag.
     * @return {string} A string in the correct tagging format.
     */
    createTag(fileId, name) {
        return `file_${fileId}_${name}`;
    }
}

export default new Timer();
