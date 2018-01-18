/* eslint-disable camelcase */

// Set of Transformers that translate data for storage
import { LOG_TYPES } from './logConstants';

const BOX_PREVIEW_LOG_CATEGORY = 'preview_log';

/**
 * Create an event log object.
 *
 * @param {string} eventType - Event type that occurred
 * @param {Object} log  - Log object to parse
 * @param {Object} info - Common info about the user's session
 * @return {Object} Contains info for one log event
 */
function makeEvent(eventType, log, info) {
    const { browser_name, client_version, locale, logger_session_id } = info;
    const { timestamp, message, fileInfo } = log;
    const { id, file_version, extension } = fileInfo.file;
    return {
        category: BOX_PREVIEW_LOG_CATEGORY,
        event_type: eventType,
        logger_session_id,
        timestamp,
        file_id: id,
        file_version_id: file_version ? file_version.id : '',
        content_type: fileInfo.contentType,
        extension,
        client_version,
        browser_name,
        locale,
        event_name: eventType,
        value: message
    };
}

/**
 * Create a generic batch of logs.
 *
 * @param {string} event - Type of event being logged.
 * @param {Object[]} logs - List of logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} A log batch.
 */
function transformGeneric(event, logs, info) {
    const batch = [];

    logs.forEach((log) => {
        const logEvent = makeEvent(event, log, info);
        batch.push(logEvent);
    });

    return batch;
}

/**
 * Creates a batch of logs for warning events.
 *
 * @param {Object[]} logs - List of warning logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} The transformed log batch.
 */
export function transformWarnings(logs, info) {
    return transformGeneric(LOG_TYPES.warning, logs, info);
}

/**
 * Creates a batch of logs for info events.
 *
 * @param {Object[]} logs - List of info logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} The transformed log batch.
 */
export function transformInfo(logs, info) {
    return transformGeneric(LOG_TYPES.info, logs, info);
}

/**
 * Creates a batch of logs for error events.
 *
 * @param {Object[]} logs - List of error logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} The transformed log batch.
 */
export function transformErrors(logs, info) {
    return transformGeneric(LOG_TYPES.error, logs, info);
}

/**
 * Creates a batch of logs for uncaught_error events.
 *
 * @param {Object[]} logs - List of error logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} The transformed log batch.
 */
export function transformUncaughtErrors(logs, info) {
    const batch = [];

    //  event_type will be error, but event_name will be uncaught_error
    logs.forEach((log) => {
        const logEvent = makeEvent(LOG_TYPES.uncaught_error, log, info);
        batch.push(logEvent);
    });

    return batch;
}

/**
 * Creates a batch of logs for metric events.
 *
 * @param {Object[]} logs - List of metric logs.
 * @param {Object} info - Common info about the user's session
 * @return {Object} The transformed log batch.
 */
export function transformMetrics(logs, info) {
    const batch = [];

    //  event_type will be error, but event_name will be uncaught_error
    logs.forEach((log) => {
        const logEvent = makeEvent(LOG_TYPES.metric, log, info);

        // Ovewrite event_name and value with actual values.
        const { value } = logEvent;
        const { eventName } = value;
        const myValue = value.value;
        logEvent.event_name = eventName;
        logEvent.value = myValue;

        batch.push(logEvent);
    });

    return batch;
}

/* eslint-enable camelcase */
