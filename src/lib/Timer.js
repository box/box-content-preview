/**
 * General purpose time recording tool
 */
class Timer {
    /** @property {Object} - Dictionary of time objects. Used to track times. tag: { start, end, elapsed } */
    times = {};

    /**
     * Start running a timer, for a tag. If a tag has already been started, then this does nothing.
     *
     * @public
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
     * @public
     * @param {string} tag - Time structure to look up, at this string.
     * @return {Object} The time structure, or undefined if none with that tag
     */
    stop(tag) {
        const time = this.get(tag);

        // The timer has already been stopped, or hasn't started. Don't stop it again.
        if (!time || time.start === undefined || time.end !== undefined) {
            return undefined;
        }

        time.end = global.performance.now();
        time.elapsed = Math.round(time.end - time.start);

        return time;
    }

    /**
     * Get the time object at a given tag.
     *
     * @public
     * @param {string} tag - The tag to get the time structure for.
     * @return {Object} The time structure, or undefined if none with that tag.
     */
    get(tag) {
        return this.times[tag];
    }

    /**
     * Resets the values in a certain time structure, if it exists.
     *
     * @public
     * @param {string|string[]} [tagOrTags] - If provided, will reset a specific time structure associated with
     * the tag or array of tags. If empty, resets all tags.
     *
     * @return {void}
     */
    reset(tagOrTags) {
        if (!tagOrTags) {
            Object.keys(this.times).forEach(this.reset.bind(this));
            return;
        }

        const tagArray = typeof tagOrTags === 'string' ? [tagOrTags] : tagOrTags;
        tagArray.forEach(tag => {
            const time = this.get(tag);
            // If nothing exists, there's no reason to reset it
            if (!time) {
                return;
            }

            time.start = undefined;
            time.end = undefined;
            time.elapsed = undefined;
        });
    }

    /**
     * Creates a tag string given a file id and event name.
     *
     * @public
     * @param {string} fileId - A file id for the file.
     * @param {string} name - A name for the tag.
     * @return {string} A string in the correct tagging format.
     */
    createTag(fileId, name) {
        return `file_${fileId}_${name}`;
    }

    /**
     * Create a new time structure at a given key (tag) in the 'times' object.
     *
     * @private
     * @param {string} tag - The tag for the new time structure.
     * @return {Object} The newly created structure, inserted into the 'times' object, as key: tag
     */
    create(tag) {
        const time = {
            start: undefined,
            end: undefined,
            elapsed: undefined,
        };

        this.times[tag] = time;
        return time;
    }
}

export default new Timer();
