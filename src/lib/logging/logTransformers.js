// Set of Transformers that translate data for storage
import { getISOTime } from './logUtils';
import { LOG_TYPES } from './logConstants';
import { METRIC_CONTROL } from './metricsConstants';

/**
 * Creates basic structure for all lgos to be saved.
 *
 * @param {string} event - Type of event being logged.
 * @return {Object} The base container object for storing logs.
 */
function makeBatchContainer(event) {
    return {
        event_type: event,
        events: []
    };
}

/**
 * Create an event log object.
 *
 * @param {string} event - Event type that occurred
 * @param {Object} log  - Log object to parse
 * @return {Object} Contains info for one log event
 */
function makeEvent(event, log) {
    const { timestamp, message, fileInfo } = log;
    const { id, file_version, extension } = fileInfo.file;
    return {
        content_type: fileInfo.contentType,
        event_name: event,
        extension,
        file_id: id,
        // eslint-disable-next-line
        file_version_id: file_version ? file_version.id : '',
        timestamp,
        value: message
    };
}

/**
 * Create a generic batch of logs.
 *
 * @param {string} event - Type of event being logged.
 * @param {Object[]} logs - List of logs.
 * @return {Object} A log batch.
 */
function transformGeneric(event, logs) {
    const batch = makeBatchContainer(event);

    logs.forEach((log) => {
        const logEvent = makeEvent(event, log);
        batch.events.push(logEvent);
    });

    return batch;
}

/**
 * If a dictionary of objects is passed in, groups events and adds to the batch.
 *
 * @param {Object} events - Dictionary of preview_control events, key: file_id, value: { version_id: [] }
 * @param {Object} batch - Batch Object.
 * @return {void}
 */
function addControlEventsToBatch(events, batch) {
    // If control events occurred, save those too.
    const keys = Object.keys(events);
    if (!keys.length) {
        return;
    }

    keys.forEach((fileId) => {
        Object.keys(events[fileId]).forEach((fileVersionId) => {
            Object.keys(events[fileId][fileVersionId]).forEach((contentType) => {
                // Since they're from the same file version, we only need to
                // batch, further based on content_type
                const eventList = events[fileId][fileVersionId][contentType];
                const { length } = eventList;
                if (!length) {
                    return;
                }

                // Extension is shared
                const { extension } = eventList[length - 1];

                batch.events.push({
                    event_name: METRIC_CONTROL,
                    content_type: contentType,
                    extension,
                    file_id: fileId,
                    file_version_id: fileVersionId,
                    timestamp: getISOTime(),
                    value: eventList
                });
            });
        });
    });
}

/**
 * Creates a batch of logs for warning events.
 *
 * @param {Object[]} logs - List of warning logs.
 * @return {Object} The transformed log batch.
 */
export function transformWarnings(logs) {
    return transformGeneric(LOG_TYPES.warning, logs);
}

/**
 * Creates a batch of logs for info events.
 *
 * @param {Object[]} logs - List of info logs.
 * @return {Object} The transformed log batch.
 */
export function transformInfo(logs) {
    return transformGeneric(LOG_TYPES.info, logs);
}

/**
 * Creates a batch of logs for error events.
 *
 * @param {Object[]} logs - List of error logs.
 * @return {Object} The transformed log batch.
 */
export function transformErrors(logs) {
    return transformGeneric(LOG_TYPES.error, logs);
}

/**
 * Creates a batch of logs for uncaught_error events.
 *
 * @param {Object[]} logs - List of error logs.
 * @return {Object} The transformed log batch.
 */
export function transformUncaughtErrors(logs) {
    const batch = makeBatchContainer(LOG_TYPES.error);

    //  event_type will be error, but event_name will be uncaught_error
    logs.forEach((log) => {
        const logEvent = makeEvent(LOG_TYPES.uncaught_error, log);
        batch.events.push(logEvent);
    });

    return batch;
}

/**
 * Creates a batch of logs for metric events.
 *
 * @param {Object[]} logs - List of metric logs.
 * @return {Object} The transformed log batch.
 */
export function transformMetrics(logs) {
    const batch = makeBatchContainer(LOG_TYPES.metric);
    const controlEvents = {};

    logs.forEach((log) => {
        const { message } = log;
        const { eventName } = message;

        const metricEvent = makeEvent(eventName, log);

        // Filter out control events, so we can group them.
        // Groups are base on file_id, content_type, and file_version_id
        if (eventName === METRIC_CONTROL) {
            const { value } = message;
            const { file_id, file_version_id, content_type } = metricEvent;

            // File ID Group
            if (!controlEvents[file_id]) {
                controlEvents[file_id] = {};
            }

            // File Version ID Group
            if (!controlEvents[file_id][file_version_id]) {
                controlEvents[file_id][file_version_id] = {};
            }

            // Content Type Group
            if (!controlEvents[file_id][file_version_id][content_type]) {
                controlEvents[file_id][file_version_id][content_type] = [];
            }

            controlEvents[file_id][file_version_id][content_type].push({
                timestamp: metricEvent.timestamp,
                event_name: value // The value of a metric is the metric name of the action event
            });
        } else {
            batch.events.push(metricEvent);
        }
    });

    addControlEventsToBatch(controlEvents, batch);

    return batch;
}
