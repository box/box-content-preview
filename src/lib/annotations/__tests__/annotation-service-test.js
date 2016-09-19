import '../../polyfill';
import Annotation from '../annotation';
import AnnotationService from '../annotation-service';
import fetchMock from 'fetch-mock';

const API = 'https://app.box.com/api';

let annotationService;
let sandbox;

describe('annotation-service', () => {
    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        annotationService = new AnnotationService({
            api: API,
            fileID: 1,
            token: 'someToken',
            canAnnotate: true
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fetchMock.restore();
    });

    describe('generateID()', () => {
        it('should return a rfc4122v4-compliant GUID', () => {
            const GUID = AnnotationService.generateID();
            const regex = /^[a-z0-9]{8}-[a-z0-9]{4}-4[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{12}$/i;
            assert.ok(GUID.match(regex));
        });

        it('should (almost always) return unique GUIDs', () => {
            assert.ok(AnnotationService.generateID() !== AnnotationService.generateID());
        });
    });

    describe('create()', () => {
        const annotationToSave = new Annotation({
            fileVersionID: 2,
            threadID: AnnotationService.generateID(),
            type: 'point',
            text: 'blah',
            location: { x: 0, y: 0 }
        });
        const url = `${API}/2.0/annotations`;

        it('should create annotation and return created object', () => {
            fetchMock.mock(url, {
                body: {
                    id: AnnotationService.generateID(),
                    item: {
                        id: annotationToSave.fileVersionID
                    },
                    details: {
                        type: annotationToSave.type,
                        threadID: annotationToSave.threadID,
                        location: annotationToSave.location
                    },
                    message: annotationToSave.text,
                    created_by: {}
                }
            });

            return annotationService.create(annotationToSave).then((createdAnnotation) => {
                assert.equal(createdAnnotation.fileVersionID, annotationToSave.fileVersionID, 'Should have saved file version ID');
                assert.equal(createdAnnotation.threadID, annotationToSave.threadID, 'Should have saved thread ID');
                assert.equal(createdAnnotation.type, annotationToSave.type, 'Should have saved type');
                assert.equal(createdAnnotation.text, annotationToSave.text, 'Should have saved text');
                assert.equal(createdAnnotation.location.x, annotationToSave.location.x, 'Should have saved location');
                assert.equal(createdAnnotation.location.y, annotationToSave.location.y, 'Should have saved location');
            });
        });

        it('should reject with an error if there was a problem creating', () => {
            fetchMock.mock(url, {
                body: {
                    type: 'error'
                }
            });

            return annotationService.create(annotationToSave).then(
                () => {
                    throw new Error('Annotation should not be returned');
                },
                (error) => {
                    assert.equal(error.message, 'Could not create annotation');
                });
        });
    });

    describe('read()', () => {
        const url = `${API}/2.0/files/1/annotations?version=2&fields=item,details,message,created_by,created_at,modified_at,permissions`;

        it('should return array of annotations for the specified file and file version', () => {
            const annotation1 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah',
                location: { x: 0, y: 0 }
            });

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'highlight',
                text: 'blah2',
                location: { x: 0, y: 0 }
            });

            fetchMock.mock(url, {
                body: {
                    entries: [{
                        id: AnnotationService.generateID(),
                        item: {
                            id: annotation1.fileVersionID
                        },
                        details: {
                            type: annotation1.type,
                            threadID: annotation1.threadID,
                            location: annotation1.location
                        },
                        message: annotation1.text,
                        created_by: {}
                    }, {
                        id: AnnotationService.generateID(),
                        item: {
                            id: annotation2.fileVersionID
                        },
                        details: {
                            type: annotation2.type,
                            threadID: annotation2.threadID,
                            location: annotation2.location
                        },
                        message: annotation2.text,
                        created_by: {}
                    }]
                }
            });

            return annotationService.read(2).then((annotations) => {
                assert.equal(annotations.length, 2, 'Two annotations should have been created');
                const createdAnnotation1 = annotations[0];
                const createdAnnotation2 = annotations[1];

                assert.equal(createdAnnotation1.text, annotation1.text, 'Annotations should have been created with correct params');
                assert.equal(createdAnnotation2.text, annotation2.text, 'Annotations should have been created with correct params');
            });
        });

        it('should reject with an error if there was a problem reading', () => {
            fetchMock.mock(url, {
                body: {
                    type: 'error'
                }
            });

            return annotationService.read(2).then(
                () => {
                    throw new Error('Annotations should not be returned');
                },
                (error) => {
                    assert.equal(error.message, 'Could not read annotations from file version with ID 2');
                });
        });
    });

    describe('update()', () => {
        // @TODO(tjin): Test when update() is implemented
    });

    describe('delete()', () => {
        const url = `${API}/2.0/annotations/3`;

        it('should successfully delete the annotation', () => {
            fetchMock.mock(url, 204);

            return annotationService.delete(3).then(() => {
                assert.ok(fetchMock.called(url));
            });
        });

        it('should reject with an error if there was a problem deleting', () => {
            fetchMock.mock(url, 401);

            return annotationService.delete(3).then(
                () => {
                    throw new Error('Annotation should not have been deleted');
                },
                (error) => {
                    assert.equal(error.message, 'Could not delete annotation with ID 3');
                });
        });
    });

    describe('getThreadMap()', () => {
        it('should call read and then generate a map of thread ID to annotations in those threads', () => {
            const annotation1 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah',
                location: { x: 0, y: 0 }
            });

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah2',
                location: { x: 0, y: 0 }
            });

            const annotation3 = new Annotation({
                fileVersionID: 2,
                threadID: annotation1.threadID,
                type: 'point',
                text: 'blah3',
                location: { x: 0, y: 0 }
            });

            sandbox.stub(annotationService, 'read').returns(Promise.resolve([annotation1, annotation2, annotation3]));

            return annotationService.getThreadMap(2).then((threadMap) => {
                assert.equal(threadMap[annotation1.threadID].length, 2, 'First thread should have two annotations');
                assert.equal(threadMap[annotation2.threadID][0], annotation2, 'Threads should have correct annotations');
            });
        });
    });

    describe('getAnnotationUser()', () => {
        // @TODO(tjin): Test when getAnnotationUser() is updated after the release of transactional users
    });

    describe('_createThreadMap()', () => {
        it('should create a thread map with the correct annotations, in the correct order', () => {
            const annotation1 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah',
                location: { x: 0, y: 0 },
                created: Date.now()
            });
            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah2',
                location: { x: 0, y: 0 },
                created: Date.now()

            });
            const annotation3 = new Annotation({
                fileVersionID: 2,
                threadID: annotation1.threadID,
                type: 'point',
                text: 'blah3',
                location: { x: 0, y: 0 },
                created: Date.now()

            });
            const threadMap = annotationService._createThreadMap([annotation1, annotation2, annotation3]);

            assert.equal(threadMap[annotation1.threadID].length, 2, 'First thread should have two annotations');
            assert.equal(threadMap[annotation1.threadID][0], annotation1, 'The first thread added should appear first in the map');
        });
    });

    describe('_createAnnotation()', () => {
        it('should call the Annotation constructor', () => {
            const data = {
                fileVersionID: 2,
                threadID: 1,
                type: 'point',
                text: 'blah3',
                location: { x: 0, y: 0 },
                created: Date.now(),
                item: { id: 1 },
                details: { threadID: 1 },
                created_by: { id: 1 }
            };
            const annotation1 = annotationService._createAnnotation(data);

            assert.equal(annotation1 instanceof Annotation, true);
        });
    });

    describe('_readFromMarker()', () => {
        it('should get subsequent annotations if a marker is present', () => {
            const markerUrl = annotationService._getReadUrl(2, 'a', 1);

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'highlight',
                text: 'blah2',
                location: { x: 0, y: 0 }
            });

            fetchMock.mock(markerUrl, {
                body: {
                    entries: [{
                        id: AnnotationService.generateID(),
                        item: {
                            id: annotation2.fileVersionID
                        },
                        details: {
                            type: annotation2.type,
                            threadID: annotation2.threadID,
                            location: annotation2.location
                        },
                        message: annotation2.text,
                        created_by: {}
                    }]
                }
            });

            let resolve;
            let reject;
            const promise = new Promise((success, failure) => {
                resolve = success;
                reject = failure;
            });

            annotationService._annotations = [];
            annotationService._readFromMarker(resolve, reject, 2, 'a', 1);
            promise.then((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0]._text, 'blah2');
            });
        });
    });

    describe('_getReadUrl()', () => {
        it('should return the original url if no limit or marker exists', () => {
            annotationService._api = 'box';
            annotationService._fileID = 1;
            const fileVersionID = 2;
            const url = `${annotationService._api}/2.0/files/${annotationService._fileID}/annotations?version=${fileVersionID}&fields=item,details,message,created_by,created_at,modified_at,permissions`;

            const result = annotationService._getReadUrl(fileVersionID);
            assert.equal(result, url);
        });

        it('should add a marker and limit if provided', () => {
            annotationService._api = 'box';
            annotationService._fileID = 1;
            const fileVersionID = 2;
            const marker = 'next_annotation';
            const limit = 1;
            const url = `${annotationService._api}/2.0/files/${annotationService._fileID}/annotations?version=${fileVersionID}&fields=item,details,message,created_by,created_at,modified_at,permissions&marker=${marker}&limit=${limit}`;

            const result = annotationService._getReadUrl(fileVersionID, marker, limit);
            assert.equal(result, url);
        });
    });
});
