import { LOG_TYPES, CONSOLE_LEVELS } from './logConstants';
import { arrayToString } from './logUtils';

// By default, print nothing.
const DEFAULT_CONSOLE_LEVEL = CONSOLE_LEVELS.silent;

class Console {
    /** @property {CONSOLE_LEVELS} - Level of logging allowed to the console */
    level = DEFAULT_CONSOLE_LEVEL;

    /**
     * Sets the current level of messages to be logged to the console.
     *
     * @public
     * @param {CONSOLE_LEVELS|string} level - The level of logging to log to console.
     * @return {void}
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Maps logging type to a console printing function. Defaults to 'info = console.log'
     *
     * @private
     * @param {LOG_TYPES|string|null} type - The log type to lookup a corresponding console print method.
     * @return {Function} A function that can be invoked with a string, to print a message to the console.
     */
    getConsoleFunction(type) {
        let logFunction;
        /* eslint-disable no-console */
        switch (type) {
            case LOG_TYPES.warning:
                logFunction = console.warn;
                break;
            case LOG_TYPES.error:
            case LOG_TYPES.uncaught_error:
                logFunction = console.error;
                break;
            case LOG_TYPES.info:
            // fall through
            default:
                logFunction = console.log;
        }
        /* eslint-enable no-console */

        return logFunction;
    }

    /**
     * Determine whether or not we can print to the console, based on level.
     *
     * @private
     * @param {LOG_TYPES|string} type - Type of log to check.
     * @return {boolean} True if we can print to the console.
     */
    canPrintLog(type) {
        let typeValue;

        switch (type) {
            case LOG_TYPES.warning:
                typeValue = CONSOLE_LEVELS.warning;
                break;
            case LOG_TYPES.error:
            case LOG_TYPES.uncaught_error:
                typeValue = CONSOLE_LEVELS.error;
                break;
            case LOG_TYPES.info:
            default:
                typeValue = CONSOLE_LEVELS.info;
        }

        return this.level <= typeValue;
    }

    /**
     * Print a message to the console if allowed to.
     *
     * @private
     * @param {LOG_TYPES|string} type - Type of log to check and print to the console.
     * @param {*} data - Data to print to the console.
     * @return {void}
     */
    print(type, data) {
        const logFunction = this.canPrintLog(type) ? this.getConsoleFunction(type) : null;
        if (logFunction) {
            const message = arrayToString(data);
            logFunction(`[${type}] ${message}`);
        }
    }
}

export default new Console();
