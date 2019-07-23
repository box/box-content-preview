class PreviewError extends Error {
    /** @property {string} - Error code */
    code;

    /** @property {string} - Translated error message that can be displayed to a user */
    displayMessage;

    /** @property {Object} - Optional details about the error */
    details;

    /** @property {string} - Original error message */
    message;

    /**
     * [constructor]
     *
     * @param {string} code - Error code
     * @param {string} [displayMessage] - Translated error message that can be displayed to a user
     * @param {Object} [details] - Optional error options
     * @param {string} [message] - Original error message
     * @param {...Object} [params] - Additional params
     * @return {PreviewError} PreviewError instance
     */
    constructor(code, displayMessage = '', details = {}, message, ...params) {
        // Pass remaining arguments to parent constructor
        super(message, ...params);

        // Workaround to make `instanceof PreviewError` work in ES5
        this.constructor = PreviewError;
        // eslint-disable-next-line
        this.__proto__ = PreviewError.prototype;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PreviewError);
        }

        this.code = code;
        this.details = details;

        // Default display message to generic error message if not set
        this.displayMessage = displayMessage || __('error_generic');

        // Default base error message to display message if not set - some code may depend on Error.message
        this.message = message || this.displayMessage;
    }
}

export default PreviewError;
