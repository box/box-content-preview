import { getHeaders } from './util';

const ACTIVITY_TYPES = ['enhanced_annotation', 'enhanced_comment', 'task', 'versions'];
const REPLY_LIMIT = 1000;

const TIMESTAMP_PREFIX_REGEX = /^#\[timestamp:(\d+)(?:,versionId:\d+)?\]\s*/;

export default class TimestampedCommentsAPI {
    /**
     * Builds the file_activities URL for a given file.
     *
     * @param {string} fileId - File id
     * @param {string} apiHost - API host
     * @return {string} The file activities URL
     */
    static getURL(fileId, apiHost) {
        return (
            `${apiHost}/2.0/file_activities` +
            `?file_id=${fileId}` +
            `&activity_types=${ACTIVITY_TYPES.join(',')}` +
            `&enable_replies=true` +
            `&reply_limit=${REPLY_LIMIT}`
        );
    }

    /**
     * Filters the file_activities response down to comments with a timestamp
     * prefix and reshapes them for the scrubber-marker overlay.
     *
     * @param {Object} response - file_activities response payload
     * @return {Array<{id: string, time: number, message: string, createdAt: string, user: {name: string, avatarUrl?: string}}>}
     */
    static parseResponse(response) {
        const entries = (response && response.entries) || [];

        return entries.reduce((acc, entry) => {
            const isComment = entry.activity_type === 'enhanced_comment' || entry.activity_type === 'comment';
            if (!isComment || !entry.source) {
                return acc;
            }

            const comment = entry.source.enhanced_comment || entry.source.comment;
            if (!comment) {
                return acc;
            }

            const message = (comment.message || '').toString();
            const match = message.match(TIMESTAMP_PREFIX_REGEX);
            if (!match) {
                return acc;
            }

            const createdBy = comment.created_by || {};
            acc.push({
                createdAt: comment.created_at,
                id: comment.id,
                message: message.replace(TIMESTAMP_PREFIX_REGEX, ''),
                time: parseInt(match[1], 10) / 1000,
                user: {
                    avatarUrl: createdBy.avatar_url,
                    name: createdBy.name || '',
                },
            });
            return acc;
        }, []);
    }

    /** @property {Api} Preview's instance of the api for XHR calls */
    api;

    /**
     * @param {Api} client - Preview's instance of the api.
     */
    constructor(client) {
        this.api = client;
    }

    /**
     * Fetches the file's activity feed and returns just the timestamped
     * comments, in scrubber-marker shape.
     *
     * @param {string} fileId - File id
     * @param {Object} options - options object
     * @param {string} options.apiHost - api host
     * @param {string} options.token - authentication token
     * @param {string} [options.sharedLink] - shared link
     * @param {string} [options.sharedLinkPassword] - shared link password
     * @return {Promise<Array>} Resolves with the parsed timestamped-comment list
     */
    getTimestampedComments(fileId, { apiHost, token, sharedLink, sharedLinkPassword }) {
        const url = TimestampedCommentsAPI.getURL(fileId, apiHost);
        return this.api
            .get(url, {
                headers: getHeaders({}, token, sharedLink, sharedLinkPassword),
            })
            .then(TimestampedCommentsAPI.parseResponse);
    }
}
