/* eslint-disable no-unused-expressions */
import AnnotationThread from '../annotation-thread';
import * as constants from '../annotation-constants';

let annotationThread;
const sandbox = sinon.sandbox.create();

describe('annotation-thread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotation/__tests__/annotation-thread-test.html');

        annotationThread = new AnnotationThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionID: 1,
            location: {},
            threadID: 2,
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
    });

    afterEach(() => {
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
            assert.ok(annotationThread._element.classList.contains('box-preview-is-hidden'), 'Thread element should be hidden');
        });
    });

    describe('reset()', () => {
        it('should set the thread state to inactive', () => {
            annotationThread.reset();
            assert.equal(annotationThread._state, constants.ANNOTATION_STATE_INACTIVE, 'Thread state should be inactive');
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
                fileVersionID: 1,
                location: {},
                threadID: 2,
                type: 'point'
            });
        });

        it('should save an annotation with the specified type and text', () => {
            const createStub = sandbox.stub(annotationService, 'create').returns(Promise.resolve({}));
            annotationThread.saveAnnotation('point', 'blah');

            expect(createStub).to.have.been.calledWith(sinon.match({
                fileVersionID: 1,
                type: 'point',
                text: 'blah',
                threadID: 2
            }));
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
                fileVersionID: 1,
                location: {},
                threadID: 2,
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
                fileVersionID: 1,
                location: {},
                threadID: 2,
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
            expect(addEventListenerStub).to.have.been.calledWith('mouseover', sinon.match.func);
            expect(addEventListenerStub).to.have.been.calledWith('mouseout', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            annotationThread._element = document.createElement('div');
            const removeEventListenerStub = sandbox.stub(annotationThread._element, 'removeEventListener');

            annotationThread.unbindDOMListeners();

            expect(removeEventListenerStub).to.have.been.calledWith('click', sinon.match.func);
            expect(removeEventListenerStub).to.have.been.calledWith('mouseover', sinon.match.func);
            expect(removeEventListenerStub).to.have.been.calledWith('mouseout', sinon.match.func);
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
});
