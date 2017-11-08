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

export default arrayToString;
