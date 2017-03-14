import EventEmitter from 'events';
import fetch from 'isomorphic-fetch';
import autobind from 'autobind-decorator';
import Annotation from './Annotation';
import { getHeaders } from '../util';

const ANONYMOUS_USER = {
    id: '0',
    name: __('annotation_anonymous_user_name')
};

@autobind
class AnnotationService extends EventEmitter {

    //--------------------------------------------------------------------------
    // Static
    //--------------------------------------------------------------------------

    /**
     * Generates a rfc4122v4-compliant GUID, from
     * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript.
     *
     * @return {string} UUID for annotation
     */
    static generateID() {
        /* eslint-disable */
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        /* eslint-enable */
    }

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an Annotation Service.
     * @typedef {Object} AnnotationServiceData
     * @property {string} apiHost API root
     * @property {string} fileId File ID
     * @property {string} token Access token
     * @property {boolean} canAnnotate Can user annotate
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationServiceData} data - Annotation Service data
     * @return {AnnotationService} AnnotationService instance
     */
    constructor(data) {
        super();
        this._api = data.apiHost;
        this._fileId = data.fileId;
        this._headers = getHeaders({}, data.token);
        this._canAnnotate = data.canAnnotate;
        this._user = ANONYMOUS_USER;
    }

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation - Annotation to save
     * @return {Promise} Promise that resolves with created annotation
     */
    create(annotation) {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/annotations`, {
                method: 'POST',
                headers: this._headers,
                body: JSON.stringify({
                    item: {
                        type: 'file_version',
                        id: annotation.fileVersionID
                    },
                    details: {
                        type: annotation.type,
                        location: annotation.location,
                        threadID: annotation.threadID
                    },
                    message: annotation.text,
                    thread: annotation.thread
                })
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.type !== 'error' && data.id) {
                    // @TODO(tjin): Remove this when response has permissions
                    const tempData = data;
                    tempData.permissions = {
                        can_edit: true,
                        can_delete: true
                    };
                    const createdAnnotation = this.createAnnotation(tempData);

                    // Set user if not set already
                    if (this._user.id === '0') {
                        this._user = createdAnnotation.user;
                    }

                    resolve(createdAnnotation);
                } else {
                    reject(new Error('Could not create annotation'));
                    this.emit('annotationerror', {
                        reason: 'create'
                    });
                }
            })
            /* istanbul ignore next */
            .catch(() => {
                reject(new Error('Could not create annotation due to invalid or expired token'));
                this.emit('annotationerror', {
                    reason: 'authorization'
                });
            });
        });
    }

    /**
     * Reads annotations from file version ID.
     *
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @return {Promise} Promise that resolves with fetched annotations
     */
    read(fileVersionID) {
        this._annotations = [];
        let resolve;
        let reject;
        const promise = new Promise((success, failure) => {
            resolve = success;
            reject = failure;
        });

        this.readFromMarker(resolve, reject, fileVersionID);
        return promise;
    }

    /**
     * Delete an annotation.
     *
     * @param {string} annotationID - Id of annotation to delete
     * @return {Promise} Promise to delete annotation
     */
    delete(annotationID) {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/annotations/${annotationID}`, {
                method: 'DELETE',
                headers: this._headers
            })
            .then((response) => {
                if (response.status === 204) {
                    resolve();
                } else {
                    reject(new Error(`Could not delete annotation with ID ${annotationID}`));
                    this.emit('annotationerror', {
                        reason: 'delete'
                    });
                }
            })
            /* istanbul ignore next */
            .catch(() => {
                reject(new Error('Could not delete annotation due to invalid or expired token'));
                this.emit('annotationerror', {
                    reason: 'authorization'
                });
            });
        });
    }

    /**
     * Gets a map of thread ID to annotations in that thread.
     *
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @return {Promise} Promise that resolves with thread map
     */
    getThreadMap(fileVersionID) {
        return this.read(fileVersionID).then(this.createThreadMap);
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets canAnnotate.
     *
     * @return {boolean} Whether or not user can create or modify annotations.
     */
    get canAnnotate() {
        return this._canAnnotate;
    }

    /**
     * Gets canDelete.
     *
     * @return {boolean} Whether or not user can create or modify annotations.
     */
    get canDelete() {
        return this._canDelete;
    }

    /**
     * Gets user.
     *
     * @return {Object} User object
     */
    get user() {
        return this._user;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Generates a map of thread ID to annotations in thread.
     *
     * @private
     * @param {Annotation[]} annotations - Annotations to generate map from
     * @return {Object} Map of thread ID to annotations in that thread
     */
    createThreadMap(annotations) {
        const threadMap = {};

        // Construct map of thread ID to annotations
        annotations.forEach((annotation) => {
            const threadID = annotation.threadID;
            threadMap[threadID] = threadMap[threadID] || [];
            threadMap[threadID].push(annotation);
        });

        // Sort annotations by date created
        Object.keys(threadMap).forEach((threadID) => {
            threadMap[threadID].sort((a, b) => {
                return new Date(a.created) - new Date(b.created);
            });
        });

        return threadMap;
    }

    /**
     * Generates an Annotation object from an API response.
     *
     * @private
     * @param {Object} data - API response data
     * @return {Annotation} Created annotation
     */
    createAnnotation(data) {
        return new Annotation({
            annotationID: data.id,
            fileVersionID: data.item.id,
            threadID: data.details.threadID,
            type: data.details.type,
            thread: data.thread,
            text: data.message,
            location: data.details.location,
            user: {
                id: data.created_by.id,
                name: data.created_by.name,
                avatarUrl: data.created_by.profile_image
            },
            permissions: data.permissions,
            created: data.created_at,
            modified: data.modified_at
        });
    }

    /**
     * Construct the URL to read annotations with a marker or limit added
     *
     * @private
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @param {string} marker - marker to use if there are more than limit annotations
     *  * @param {int} limit - the amout of annotations the API will return per call
     * @return {Promise} Promise that resolves with fetched annotations
     */
    getReadUrl(fileVersionID, marker = null, limit = null) {
        let apiUrl = `${this._api}/2.0/files/${this._fileId}/annotations?version=${fileVersionID}&fields=item,thread,details,message,created_by,created_at,modified_at,permissions`;
        if (marker) {
            apiUrl += `&marker=${marker}`;
        }

        if (limit) {
            apiUrl += `&limit=${limit}`;
        }

        return apiUrl;
    }

    /**
     * Reads annotations from file version ID starting at a marker. The default
     * limit is 100 annotations per API call.
     *
     * @private
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @param {string} marker - marker to use if there are more than limit annotations
     * @param {int} limit - the amout of annotations the API will return per call
     * @return {void}
     */
    readFromMarker(resolve, reject, fileVersionID, marker = null, limit = null) {
        fetch(this.getReadUrl(fileVersionID, marker, limit), {
            headers: this._headers })
        .then((response) => response.json())
        .then((data) => {
            if (data.type === 'error' || !Array.isArray(data.entries)) {
                reject(new Error(`Could not read annotations from file version with ID ${fileVersionID}`));
                this.emit('annotationerror', {
                    reason: 'read'
                });
            } else {
                data.entries.forEach((annotationData) => {
                    this._annotations.push(this.createAnnotation(annotationData));
                });

                if (data.next_marker) {
                    this.readFromMarker(resolve, reject, fileVersionID, data.next_marker, limit);
                } else {
                    resolve(this._annotations);
                }
            }
        })
        .catch(() => {
            reject(new Error('Could not read annotations from file due to invalid or expired token'));
            this.emit('annotationerror', {
                reason: 'authorization'
            });
        });
    }
}
export default AnnotationService;
