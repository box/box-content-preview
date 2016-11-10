/* eslint-disable no-unused-expressions */
import AnnotationThread from '../annotation-thread';
import Annotation from '../annotation';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';

let annotationThread;
const sandbox = sinon.sandbox.create();

describe('annotation-thread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/annotation-thread-test.html');

        annotationThread = new AnnotationThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionID: '1',
            location: {},
            threadID: '2',
            thread: '1',
            type: 'point'
        });

        annotationThread._dialog = {
            addListener: () => {},
            addAnnotation: () => {},
            destroy: () => {},
            removeAllListeners: () => {},
            show: () => {},
            hide: () => {}
        };

        annotationThread._annotationService = {
            user: { id: '1' }
        };
    });

    afterEach(() => {
        annotationThread._annotationService = undefined;
        sandbox.verifyAndRestore();
    });

    describe('destroy()', () => {
        it('should unbind listeners and remove thread element and broadcast that the thread was deleted', () => {
            const unbindCustomListenersOnDialogStub = sandbox.stub(annotationThread, 'unbindCustomListenersOnDialog');
            const unbindDOMListenersStub = sandbox.stub(annotationThread, 'unbindDOMListeners');
            const emitStub = sandbox.stub(annotationThread, 'emit');

            annotationThread.destroy();

            expect(unbindCustomListenersOnDialogStub).to.have.been.called;
            expect(unbindDOMListenersStub).to.have.been.called;
            expect(emitStub).to.have.been.calledWith('threaddeleted');
        });
    });

    describe('hide()', () => {
        it('should hide the thread element', () => {
            annotationThread.hide();
            expect(annotationThread._element.classList.contains('box-preview-is-hidden')).to.be.true;
        });
    });

    describe('reset()', () => {
        it('should set the thread state to inactive', () => {
            annotationThread.reset();
            expect(annotationThread._state).to.equal(constants.ANNOTATION_STATE_INACTIVE);
        });
    });

    describe('showDialog()', () => {
        it('should show the thread dialog', () => {
            sandbox.mock(annotationThread._dialog).expects('show');
            annotationThread.showDialog();
        });
    });

    describe('hideDialog()', () => {
        it('should hide the thread dialog', () => {
            sandbox.mock(annotationThread._dialog).expects('hide');
            annotationThread.hideDialog();
        });
    });

    describe('saveAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                create: () => {}
            };

            annotationThread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [],
                annotationService,
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });
        });

        it('should save an annotation with the specified type and text', () => {
            const createStub = sandbox.stub(annotationService, 'create').returns(Promise.resolve({}));
            annotationThread.saveAnnotation('point', 'blah');

            expect(createStub).to.have.been.calledWith(sinon.match({
                fileVersionID: '1',
                type: 'point',
                text: 'blah',
                threadID: '2',
                thread: '1'
            }));

            expect(annotationThread.state).to.equal(constants.ANNOTATION_STATE_HOVER);
        });

        it('should delete the temporary annotation and broadcast an error if there was an error saving', (done) => {
            const createStub = sandbox.stub(annotationService, 'create').returns(Promise.reject());
            const deleteAnnotationStub = sandbox.stub(annotationThread, 'deleteAnnotation');

            annotationThread.on('annotationcreateerror', () => {
                expect(deleteAnnotationStub).to.have.been.called;
                done();
            });

            annotationThread.saveAnnotation('point', 'blah');
            expect(createStub).to.have.been.called;
        });
    });

    describe('deleteAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                delete: () => {}
            };

            annotationThread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{
                    annotationID: 'someID'
                }],
                annotationService,
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });

            annotationThread._dialog = {
                addListener: () => {},
                addAnnotation: () => {},
                destroy: () => {},
                removeAllListeners: () => {},
                show: () => {},
                hide: () => {},
                removeAnnotation: () => {}
            };
        });

        it('should destroy the thread if the deleted annotation was the last annotation in the thread', () => {
            const destroyStub = sandbox.stub(annotationThread, 'destroy');
            annotationThread.deleteAnnotation('someID', false);
            expect(destroyStub).to.have.been.called;
        });

        it('should remove the relevant annotation from its dialog if the deleted annotation was not the last one', () => {
            // Add another annotation to thread so 'someID' isn't the only annotation
            annotationThread._annotations.push({
                annotationID: 'someID2'
            });
            sandbox.mock(annotationThread._dialog).expects('removeAnnotation').withArgs('someID');
            annotationThread.deleteAnnotation('someID', false);
        });

        it('should make a server call to delete an annotation with the specified ID if useServer is true', () => {
            const deleteStub = sandbox.stub(annotationService, 'delete').returns(Promise.resolve());
            annotationThread.deleteAnnotation('someID', true);
            expect(deleteStub).to.have.been.calledWith('someID');
        });

        it('should not make a server call to delete an annotation with the specified ID if useServer is false', () => {
            const deleteStub = sandbox.stub(annotationService, 'delete').returns(Promise.resolve());
            annotationThread.deleteAnnotation('someID', false);
            expect(deleteStub).to.have.been.not.be.called;
        });

        it('should broadcast an error if there was an error deleting from server', (done) => {
            const deleteStub = sandbox.stub(annotationService, 'delete').returns(Promise.reject());
            annotationThread.on('annotationdeleteerror', () => {
                done();
            });

            annotationThread.deleteAnnotation('someID', true);
            expect(deleteStub).to.have.been.called;
        });

        it('should toggle highlight dialogs with the delete of the last comment if user does not have permission to delete the entire annotation', () => {
            annotationThread._annotations.push({
                annotationID: 'someID2',
                permissions: {
                    can_delete: false
                }
            });

            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            sandbox.stub(annotationThread, 'cancelFirstComment');
            sandbox.stub(annotationThread, 'destroy');

            annotationThread.deleteAnnotation('someID', false);
            expect(annotationThread.cancelFirstComment).to.have.been.called;
            expect(annotationThread.destroy).to.not.have.been.called;
        });

        it('should destroy the annotation with the delete of the last comment if the user has permissions', () => {
            annotationThread._annotations.push({
                annotationID: 'someID2',
                permissions: {
                    can_delete: true
                }
            });

            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            sandbox.stub(annotationThread, 'cancelFirstComment');
            sandbox.stub(annotationThread, 'destroy');

            annotationThread.deleteAnnotation('someID', false);
            expect(annotationThread.cancelFirstComment).to.not.have.been.called;
            expect(annotationThread.destroy).to.have.been.called;
        });
    });

    describe('setup()', () => {
        it('should set state to pending if thread is initialized with no annotations', () => {
            const createDialogStub = sandbox.stub(annotationThread, 'createDialog');
            const bindCustomStub = sandbox.stub(annotationThread, 'bindCustomListenersOnDialog');
            const setupElementStub = sandbox.stub(annotationThread, 'setupElement');

            annotationThread.setup();

            expect(annotationThread._state).to.equal(constants.ANNOTATION_STATE_PENDING);
            expect(createDialogStub).to.have.been.called;
            expect(bindCustomStub).to.have.been.called;
            expect(setupElementStub).to.have.been.called;
        });

        it('should set state to inactive if thread is initialized with annotations', () => {
            annotationThread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{}],
                annotationService: {},
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });
            const createDialogStub = sandbox.stub(annotationThread, 'createDialog');
            const bindCustomStub = sandbox.stub(annotationThread, 'bindCustomListenersOnDialog');
            const setupElementStub = sandbox.stub(annotationThread, 'setupElement');

            annotationThread.setup();

            expect(annotationThread._state).to.equal(constants.ANNOTATION_STATE_INACTIVE);
            expect(createDialogStub).to.have.been.called;
            expect(bindCustomStub).to.have.been.called;
            expect(setupElementStub).to.have.been.called;
        });
    });

    describe('setupElement()', () => {
        it('should create element and bind listeners', () => {
            const bindStub = sandbox.stub(annotationThread, 'bindDOMListeners');

            annotationThread.setupElement();

            expect(annotationThread._element instanceof HTMLElement).to.be.true;
            expect(annotationThread._element.classList.contains('box-preview-point-annotation-btn')).to.be.true;
            expect(bindStub).to.have.been.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            annotationThread._element = document.createElement('div');
            const addEventListenerStub = sandbox.stub(annotationThread._element, 'addEventListener');

            annotationThread.bindDOMListeners();

            expect(addEventListenerStub).to.have.been.calledWith('click', sinon.match.func);
            expect(addEventListenerStub).to.have.been.calledWith('mouseenter', sinon.match.func);
            expect(addEventListenerStub).to.have.been.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            annotationThread._element = document.createElement('div');
            const removeEventListenerStub = sandbox.stub(annotationThread._element, 'removeEventListener');

            annotationThread.unbindDOMListeners();

            expect(removeEventListenerStub).to.have.been.calledWith('click', sinon.match.func);
            expect(removeEventListenerStub).to.have.been.calledWith('mouseenter', sinon.match.func);
            expect(removeEventListenerStub).to.have.been.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('bindCustomListenersOnDialog()', () => {
        it('should bind custom listeners on dialog', () => {
            annotationThread._dialog = {
                addListener: () => {}
            };

            const addListenerStub = sandbox.stub(annotationThread._dialog, 'addListener');

            annotationThread.bindCustomListenersOnDialog();

            expect(addListenerStub).to.have.been.calledWith('annotationcreate', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('annotationcancel', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('annotationdelete', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnDialog()', () => {
        it('should unbind custom listeners from dialog', () => {
            annotationThread._dialog = {
                removeAllListeners: () => {}
            };

            const removeAllListenersStub = sandbox.stub(annotationThread._dialog, 'removeAllListeners');

            annotationThread.unbindCustomListenersOnDialog();

            expect(removeAllListenersStub).to.have.been.calledWith('annotationcreate');
            expect(removeAllListenersStub).to.have.been.calledWith('annotationcancel');
            expect(removeAllListenersStub).to.have.been.calledWith('annotationdelete');
        });
    });

    describe('_createElement()', () => {
        it('should create an element with the right class and attribute', () => {
            const element = annotationThread._createElement();

            expect(element.classList.contains('box-preview-point-annotation-btn')).to.be.true;
            expect(element.getAttribute('data-type')).to.equal('annotation-indicator');
        });
    });

    describe('_mouseoutHandler()', () => {
        it('should not call hideDialog if there are no annotations in the thread', () => {
            const hideStub = sandbox.stub(annotationThread, 'hideDialog');

            annotationThread._mouseoutHandler();
            expect(hideStub).to.not.be.called;
        });

        it('should call hideDialog if there are annotations in the thread', () => {
            const hideStub = sandbox.stub(annotationThread, 'hideDialog');
            const annotation1 = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            annotationThread._annotations = [annotation1];
            annotationThread._mouseoutHandler();
            expect(hideStub).to.be.called;
        });
    });

    describe('_saveAnnotationToThread()', () => {
        it('should push the annotation, and add to the dialog when the dialog exists', () => {
            const addStub = sandbox.stub(annotationThread._dialog, 'addAnnotation');
            const pushStub = sandbox.stub(annotationThread._annotations, 'push');
            const annotation1 = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            annotationThread._saveAnnotationToThread(annotation1);
            expect(addStub).to.be.calledWith(annotation1);
            expect(pushStub).to.be.calledWith(annotation1);
        });

        it('should not try to push an annotation to the dialog if it doesn\'t exist', () => {
            const addStub = sandbox.stub(annotationThread._dialog, 'addAnnotation');
            const annotation1 = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            annotationThread._dialog = undefined;
            annotationThread._saveAnnotationToThread(annotation1);
            expect(addStub).to.not.be.called;
        });
    });

    describe('_createAnnotationDialog()', () => {
        it('should correctly create the annotation data object', () => {
            const annotationData = annotationThread._createAnnotationData('highlight', 'test');

            expect(annotationData.location).to.equal(annotationThread._location);
            expect(annotationData.fileVersionID).to.equal(annotationThread._fileVersionID);
            expect(annotationData.thread).to.equal(annotationThread._thread);
            expect(annotationData.user.id).to.equal('1');
        });
    });
});
