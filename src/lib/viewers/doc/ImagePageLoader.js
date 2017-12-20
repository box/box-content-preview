import EventEmitter from 'events';
import RepStatus from '../../RepStatus';

const REPS = ['png_1024x1024', 'png_2048x2048', 'jpg_1024x1024'];

class ImagePageLoader extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {Object} options Viewer options
     */
    constructor(options) {
        super();
        this.availableReps = {};
        this.options = options;
        this.checkAvailableReps();
    }

    /**
     * Gets a representation based on preview size
     *
     * @param {number} previewHeight - Height of preview window
     * @param {number} previewWidth - Width of preview window
     * @return {Object} Instance of RepStatus
     */
    getRepresentation(previewHeight, previewWidth) {
        let rep;
        let size;
        const maxDimension = Math.max(previewHeight, previewWidth);
        Object.keys(this.availableReps).forEach((repType) => {
            const repDimension = parseInt(this.extractDimension(repType), 10);
            const smaller = size ? repDimension < size : true;
            if (maxDimension < repDimension && smaller) {
                rep = this.availableReps[repType];
                size = repDimension;
            }
        });

        return rep;
    }

    /**
     * Returns available representations
     *
     * @return {void}
     */
    checkAvailableReps() {
        this.options.file.representations.entries.forEach((entry) => {
            const { representation, properties } = entry;
            if (
                properties &&
                properties.paged === 'true' &&
                REPS.includes(`${representation}_${properties.dimensions}`)
            ) {
                this.availableReps[`${representation}_${properties.dimensions}`] = this.getRepStatus(entry).then(() => {
                    return entry;
                });
            }
        });
    }

    /**
     * Instantiates and returns RepStatus
     *
     * @param {Object} [representation] - Representation
     * @return {RepStatus} Instance of RepStatus
     */
    getRepStatus(representation) {
        const { token, sharedLink, sharedLinkPassword } = this.options;
        return new RepStatus({
            representation,
            token,
            sharedLink,
            sharedLinkPassword
        }).getPromise();
    }

    /**
     * Returns dimension from a rep name
     *
     * @param {Object} [repString] - Representation string name
     * @return {string} Rep dimension
     */
    extractDimension(repString) {
        return repString.split('x')[1];
    }
}

export default ImagePageLoader;
