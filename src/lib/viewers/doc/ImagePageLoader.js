import EventEmitter from 'events';
import RepStatus from '../../RepStatus';

const REPS = ['png_1024x1024', 'png_2048x2048', 'jpg_1024x1024'];

class ImagePageLoader extends EventEmitter {
    constructor(options) {
        super();
        this.availableReps = {};
        this.options = options;
        this.checkAvailableReps();
    }

    getInitialRep(previewHeight, previewWidth) {
        let initialRep;
        let initialsize;
        const maxDimension = Math.max(previewHeight, previewWidth);
        Object.keys(this.availableReps).forEach((repType) => {
            const repDimension = parseInt(this.extractDimension(repType), 10);
            const smaller = initialsize ? repDimension < initialsize : true;
            if (maxDimension < repDimension && smaller) {
                initialRep = this.availableReps[repType];
                initialsize = repDimension;
            }
        });

        return initialRep;
    }

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

    extractDimension(repString) {
        return repString.split('x')[1];
    }
}

export default ImagePageLoader;
