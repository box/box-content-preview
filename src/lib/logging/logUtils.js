import { LOG_CODES } from './logConstants';

const CONSOLE_COLORS = {
    [LOG_CODES.error]: '#900C3F', // Red
    [LOG_CODES.uncaught_error]: '#C70039', // Red
    [LOG_CODES.warning]: '#FFBE33', // Yellow
    [LOG_CODES.info]: '#33BEFF', // Blue
    [LOG_CODES.metric]: '#A233FF', // Purple
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
    return Date.parse(prev.timestamp) > Date.parse(next.timestamp);
}

/**
 * Prints a single log object to the browser console.
 *
 * @param {Object} log - Log object created in printLogs().
 * @return {void}
 */
export function printLog(log) {
    const { type, message, timestamp } = log;
    const color = CONSOLE_COLORS[type] || CONSOLE_COLORS.none;
    let msg = message;

    if (Array.isArray(message)) {
        msg = arrayToString(message);
    } else if (typeof message === 'object') {
        msg = arrayToString([message]);
    }

    const output = `${timestamp} "${msg}"`;

    // eslint-disable-next-line no-console
    console.log(`%c [${log.type}] `, `color: ${color}`, output);
}
