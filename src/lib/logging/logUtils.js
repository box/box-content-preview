import { LOG_TYPES } from './logConstants';

const CONSOLE_COLORS = {
    [LOG_TYPES.error]: '#900C3F', // Red
    [LOG_TYPES.uncaught_error]: '#C70039', // Red
    [LOG_TYPES.warning]: '#FFBE33', // Yellow
    [LOG_TYPES.info]: '#33BEFF', // Blue
    [LOG_TYPES.metric]: '#A233FF', // Purple
    none: '#000' // Black
};

/**
 * Convert an array to a string, including nested objects.
 *
 * @param {Array} array - The array to convert to a string.
 * @return {string} The array as a string.
 */
export function arrayToString(array) {
    if (!Array.isArray(array)) {
        throw new Error('Invalid arguments for logging. Not an Array.');
    }

    const lastIndex = array.length - 1;
    const message = array.reduce((accumulator, value, index) => {
        let parsedValue;

        if (Array.isArray(value)) {
            parsedValue = `[${arrayToString(value)}]`;
        } else if (typeof value === 'object') {
            parsedValue = JSON.stringify(value);
        } else {
            parsedValue = value;
        }

        // Add a comma if needed
        if (index < lastIndex) {
            parsedValue += ', ';
        }

        return accumulator + parsedValue;
    }, '');

    return message;
}

/**
 * Used for sorting ISO date strings.
 *
 * @param {string} prev - First ISO date string to compare.
 * @param {string} next - Second ISO date string to compare.
 * @return {boolean} True if the previous is older than next.
 */
export function sortLogsByTime(prev, next) {
    return new Date(prev.timestamp).getTime() < new Date(next.timestamp).getTime();
}

/**
 * Prints a single log object to the browser console.
 *
 * @param {Object} log - Log object created in printLogs().
 * @return {void}
 */
export function printLog(log) {
    const { type, message, timestamp, fileInfo } = log;
    const color = CONSOLE_COLORS[type] || CONSOLE_COLORS.none;
    let msg = message;

    if (Array.isArray(message)) {
        msg = arrayToString(message);
    } else if (typeof message === 'object') {
        msg = arrayToString([message]);
    }

    const output = `${timestamp} "${msg}" File Info: ${JSON.stringify(fileInfo.file)}`;

    // eslint-disable-next-line no-console
    console.log(`%c [${log.type.toUpperCase()}] `, `color: ${color}`, output);
}

/**
 * Get current time in ISO format.
 *
 * @return {string} The time in ISO format.
 */
export function getISOTime() {
    return new Date().toISOString();
}

/**
 * Generates a GUID/UUID compliant with RFC4122 version 4.
 *
 * @return {string} A 36 character uuid
 */
export function uuidv4() {
    /* eslint-disable */
    function generateRandom(c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    }
    /* eslint-enable */

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, generateRandom);
}
