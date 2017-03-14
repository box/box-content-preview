/* eslint-disable no-unused-expressions */
import fetchMock from 'fetch-mock';
import '../../polyfill';
import Annotation from '../Annotation';
import AnnotationService from '../AnnotationService';

const API_HOST = 'https://app.box.com/api';

let annotationService;
let sandbox;

describe('lib/annotations/AnnotationService', () => {
    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        annotationService = new AnnotationService({
            apiHost: API_HOST,
            fileId: 1,
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
            expect(GUID.match(regex).length).to.satisfy;
        });

        it('should (almost always) return unique GUIDs', () => {
            expect(AnnotationService.generateID() === AnnotationService.generateID()).to.be.false;
        });
    });

    describe('create()', () => {
        const annotationToSave = new Annotation({
            fileVersionID: 2,
            threadID: AnnotationService.generateID(),
            type: 'point',
            thread: '1',
            text: 'blah',
            location: { x: 0, y: 0 }
        });
        const url = `${API_HOST}/2.0/annotations`;

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
                    thread: annotationToSave.thread,
                    message: annotationToSave.text,
                    created_by: {}
                }
            });
            const emitStub = sandbox.stub(annotationService, 'emit');


            return annotationService.create(annotationToSave).then((createdAnnotation) => {
                expect(createdAnnotation.fileVersionID).to.equal(annotationToSave.fileVersionID);
                expect(createdAnnotation.threadID).to.equal(annotationToSave.threadID);
                expect(createdAnnotation.thread).to.equal(annotationToSave.thread);
                expect(createdAnnotation.type).to.equal(annotationToSave.type);
                expect(createdAnnotation.text).to.equal(annotationToSave.text);
                expect(createdAnnotation.location.x).to.equal(annotationToSave.location.x);
                expect(createdAnnotation.location.y).to.equal(annotationToSave.location.y);
                expect(emitStub).to.not.be.called;
            });
        });

        it('should reject with an error if there was a problem creating', () => {
            fetchMock.mock(url, {
                body: {
                    type: 'error'
                }
            });
            const emitStub = sandbox.stub(annotationService, 'emit');

            return annotationService.create(annotationToSave).then(
                () => {
                    throw new Error('Annotation should not be returned');
                },
                (error) => {
                    expect(error.message).to.equal('Could not create annotation');
                    expect(emitStub).to.be.calledWith('annotationerror', {
                        reason: 'create'
                    });
                });
        });
    });

    describe('read()', () => {
        const url = `${API_HOST}/2.0/files/1/annotations?version=2&fields=item,thread,details,message,created_by,created_at,modified_at,permissions`;

        it('should return array of annotations for the specified file and file version', () => {
            const annotation1 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 }
            });

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'highlight',
                text: 'blah2',
                thread: '2',
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
                        thread: annotation1.thread,
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
                        thread: annotation2.thread,
                        created_by: {}
                    }]
                }
            });

            return annotationService.read(2).then((annotations) => {
                expect(annotations.length).to.equal(2);

                const createdAnnotation1 = annotations[0];
                const createdAnnotation2 = annotations[1];
                expect(createdAnnotation1.text).to.equal(annotation1.text);
                expect(createdAnnotation2.text).to.equal(annotation2.text);
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
                    expect(error.message).to.equal('Could not read annotations from file version with ID 2');
                });
        });
    });

    describe('update()', () => {
        // @TODO(tjin): Test when update() is implemented
    });

    describe('delete()', () => {
        const url = `${API_HOST}/2.0/annotations/3`;


        it('should successfully delete the annotation', () => {
            fetchMock.mock(url, 204);
            const emitStub = sandbox.stub(annotationService, 'emit');

            return annotationService.delete(3).then(() => {
                expect(fetchMock.called(url)).to.be.true;
                expect(emitStub).to.not.be.called;
            });
        });

        it('should reject with an error if there was a problem deleting', () => {
            fetchMock.mock(url, {
                body: {
                    type: 'error'
                }
            });
            const emitStub = sandbox.stub(annotationService, 'emit');

            return annotationService.delete(3).then(
                () => {
                    throw new Error('Annotation should not have been deleted');
                },
                (error) => {
                    expect(error.message).to.equal('Could not delete annotation with ID 3');
                    expect(emitStub).to.be.calledWith('annotationerror', {
                        reason: 'delete'
                    });
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
                thread: '1',
                location: { x: 0, y: 0 }
            });

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah2',
                thread: '2',
                location: { x: 0, y: 0 }
            });

            const annotation3 = new Annotation({
                fileVersionID: 2,
                threadID: annotation1.threadID,
                type: 'point',
                text: 'blah3',
                thread: '1',
                location: { x: 0, y: 0 }
            });

            sandbox.stub(annotationService, 'read').returns(Promise.resolve([annotation1, annotation2, annotation3]));

            return annotationService.getThreadMap(2).then((threadMap) => {
                expect(threadMap[annotation1.threadID].length).to.equal(2);
                expect(threadMap[annotation2.threadID][0]).to.contain(annotation2);
                expect(threadMap[annotation1.threadID][0].thread).to.equal(threadMap[annotation1.threadID][1].thread);
                expect(threadMap[annotation1.threadID][0].thread).to.not.equal(threadMap[annotation2.threadID][0].thread);
            });
        });
    });

    describe('getAnnotationUser()', () => {
        // @TODO(tjin): Test when getAnnotationUser() is updated after the release of transactional users
    });

    describe('createThreadMap()', () => {
        it('should create a thread map with the correct annotations, in the correct order', () => {
            // Dates are provided as a string format from the API such as "2016-10-30T14:19:56",
            // ensures that the method converts to a Date() format for comparison/sorting
            // Hard coding dates to ensure formatting resembles API response
            const annotation1 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: '2016-10-29T14:19:56'
            });

            // Ensures annotations are not provided in chronological order
            const annotation4 = new Annotation({
                fileVersionID: 2,
                threadID: annotation1.threadID,
                type: 'point',
                text: 'blah4',
                thread: '1',
                location: { x: 0, y: 0 },
                created: '2016-10-30T14:19:56'

            });

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'point',
                text: 'blah2',
                thread: '2',
                location: { x: 0, y: 0 },
                created: '2016-10-30T14:19:56'

            });

            const annotation3 = new Annotation({
                fileVersionID: 2,
                threadID: annotation1.threadID,
                type: 'point',
                text: 'blah3',
                thread: '1',
                location: { x: 0, y: 0 },
                created: '2016-10-31T14:19:56'

            });

            const threadMap = annotationService.createThreadMap([annotation1, annotation2, annotation3, annotation4]);

            expect(threadMap[annotation1.threadID].length).to.equal(3);
            expect(threadMap[annotation1.threadID][0]).to.equal(annotation1);
            expect(threadMap[annotation1.threadID][1]).to.equal(annotation4);
            expect(threadMap[annotation1.threadID][0].thread).to.equal(threadMap[annotation1.threadID][1].thread);
            expect(threadMap[annotation1.threadID][0].thread).to.not.equal(threadMap[annotation2.threadID][0].thread);
        });
    });

    describe('createAnnotation()', () => {
        it('should call the Annotation constructor', () => {
            const data = {
                fileVersionID: 2,
                threadID: 1,
                type: 'point',
                text: 'blah3',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now(),
                item: { id: 1 },
                details: { threadID: 1 },
                created_by: { id: 1 }
            };
            const annotation1 = annotationService.createAnnotation(data);

            expect(annotation1 instanceof Annotation).to.be.true;
        });
    });

    describe('readFromMarker()', () => {
        it('should get subsequent annotations if a marker is present', () => {
            const markerUrl = annotationService.getReadUrl(2, 'a', 1);

            const annotation2 = new Annotation({
                fileVersionID: 2,
                threadID: AnnotationService.generateID(),
                type: 'highlight',
                text: 'blah2',
                thread: '1',
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
                        thread: annotation2.thread,
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
            annotationService.readFromMarker(resolve, reject, 2, 'a', 1);
            promise.then((result) => {
                expect(result.length).to.equal(1);
                expect(result[0].text).to.equal(annotation2.text);
                expect(result[0].thread).to.equal(annotation2.thread);
            });
        });

        it('should reject with an error and show a notification if there was a problem reading', () => {
            const markerUrl = annotationService.getReadUrl(2, 'a', 1);

            fetchMock.mock(markerUrl, {
                body: {
                    type: 'error'
                }
            });
            const emitStub = sandbox.stub(annotationService, 'emit');

            let resolve;
            let reject;
            const promise = new Promise((success, failure) => {
                resolve = success;
                reject = failure;
            });

            annotationService._annotations = [];
            annotationService.readFromMarker(resolve, reject, 2, 'a', 1);
            return promise.then(
                () => {
                    throw new Error('Annotation should not have been deleted');
                },
                (error) => {
                    expect(error.message).to.equal('Could not read annotations from file version with ID 2');
                    expect(emitStub).to.be.calledWith('annotationerror', {
                        reason: 'read'
                    });
                });
        });

        it('should reject with an error and show a notification if the token is invalid', () => {
            const markerUrl = annotationService.getReadUrl(2, 'a', 1);

            fetchMock.mock(markerUrl, 401);
            const emitStub = sandbox.stub(annotationService, 'emit');

            let resolve;
            let reject;
            const promise = new Promise((success, failure) => {
                resolve = success;
                reject = failure;
            });

            annotationService._annotations = [];
            annotationService.readFromMarker(resolve, reject, 2, 'a', 1);
            return promise.catch(
                (error) => {
                    expect(error.message).to.equal('Could not read annotations from file due to invalid or expired token');
                    expect(emitStub).to.be.calledWith('annotationerror', {
                        reason: 'authorization'
                    });
                });
        });
    });

    describe('getReadUrl()', () => {
        it('should return the original url if no limit or marker exists', () => {
            annotationService._api = 'box';
            annotationService._fileId = 1;
            const fileVersionID = 2;
            const url = `${annotationService._api}/2.0/files/${annotationService._fileId}/annotations?version=${fileVersionID}&fields=item,thread,details,message,created_by,created_at,modified_at,permissions`;

            const result = annotationService.getReadUrl(fileVersionID);
            expect(result).to.equal(url);
        });

        it('should add a marker and limit if provided', () => {
            annotationService._api = 'box';
            annotationService._fileId = 1;
            const fileVersionID = 2;
            const marker = 'next_annotation';
            const limit = 1;
            const url = `${annotationService._api}/2.0/files/${annotationService._fileId}/annotations?version=${fileVersionID}&fields=item,thread,details,message,created_by,created_at,modified_at,permissions&marker=${marker}&limit=${limit}`;

            const result = annotationService.getReadUrl(fileVersionID, marker, limit);
            expect(result).to.equal(url);
        });
    });
});
