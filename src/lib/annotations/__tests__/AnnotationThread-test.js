/* eslint-disable no-unused-expressions */
import AnnotationThread from '../AnnotationThread';
import Annotation from '../Annotation';
import * as annotatorUtil from '../annotatorUtil';
import {
    STATES,
    TYPES,
    CLASS_ANNOTATION_POINT_MARKER,
    DATA_TYPE_ANNOTATION_INDICATOR,
    CLASS_HIDDEN
} from '../annotationConstants';

let thread;
const sandbox = sinon.sandbox.create();
let stubs = {};

describe('lib/annotations/AnnotationThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/AnnotationThread-test.html');

        thread = new AnnotationThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionId: '1',
            isMobile: false,
            location: {},
            threadID: '2',
            threadNumber: '1',
            type: 'point'
        });

        thread.dialog = {
            addListener: () => {},
            addAnnotation: () => {},
            destroy: () => {},
            setup: () => {},
            removeAllListeners: () => {},
            show: () => {},
            hide: () => {}
        };
        stubs.dialogMock = sandbox.mock(thread.dialog);

        thread.annotationService = {
            user: { id: '1' }
        };

        stubs.emit = sandbox.stub(thread, 'emit');
    });

    afterEach(() => {
        thread.annotationService = undefined;
        sandbox.verifyAndRestore();
        if (typeof stubs.destroy === 'function') {
            stubs.destroy();
            thread = null;
        }
        stubs = {};
    });

    describe('destroy()', () => {
        it('should unbind listeners and remove thread element and broadcast that the thread was deleted', () => {
            stubs.unbindCustom = sandbox.stub(thread, 'unbindCustomListenersOnDialog');
            stubs.unbindDOM = sandbox.stub(thread, 'unbindDOMListeners');

            thread.destroy();
            expect(stubs.unbindCustom).to.be.called;
            expect(stubs.unbindDOM).to.be.called;
            expect(stubs.emit).to.be.calledWith('threaddeleted');
        });

        it('should not destroy the dialog on mobile', () => {
            stubs.unbindCustom = sandbox.stub(thread, 'unbindCustomListenersOnDialog');
            stubs.destroyDialog = sandbox.stub(thread.dialog, 'destroy');
            thread.element = null;
            thread.isMobile = true;

            thread.destroy();
            expect(stubs.unbindCustom).to.not.be.called;
            expect(stubs.destroyDialog).to.not.be.called;
        });
    });

    describe('hide()', () => {
        it('should hide the thread element', () => {
            thread.hide();
            expect(thread.element).to.have.class(CLASS_HIDDEN);
        });
    });

    describe('reset()', () => {
        it('should set the thread state to inactive', () => {
            thread.reset();
            expect(thread.state).to.equal(STATES.inactive);
        });
    });

    describe('showDialog()', () => {
        it('should setup the thread dialog if the dialog element does not already exist', () => {
            thread.dialog.element = null;
            stubs.dialogMock.expects('setup');
            stubs.dialogMock.expects('show');
            thread.showDialog();
        });

        it('should not setup the thread dialog if the dialog element already exists', () => {
            thread.dialog.element = {};
            stubs.dialogMock.expects('setup').never();
            stubs.dialogMock.expects('show');
            thread.showDialog();
        });
    });

    describe('hideDialog()', () => {
        it('should hide the thread dialog', () => {
            stubs.dialogMock.expects('hide');
            thread.hideDialog();
        });
    });

    describe('saveAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                create: () => {}
            };

            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [],
                annotationService,
                fileVersionId: '1',
                location: {},
                threadID: '2',
                threadNumber: '1',
                type: 'point'
            });

            stubs.create = sandbox.stub(annotationService, 'create');
        });

        it('should save an annotation with the specified type and text', () => {
            stubs.create.returns(Promise.resolve({}));

            thread.saveAnnotation('point', 'blah');
            expect(stubs.create).to.be.calledWith(
                sinon.match({
                    fileVersionId: '1',
                    type: 'point',
                    text: 'blah',
                    threadID: '2',
                    threadNumber: '1'
                })
            );
            expect(thread.state).to.equal(STATES.hover);
        });

        it('should delete the temporary annotation and broadcast an error if there was an error saving', (done) => {
            stubs.create.returns(Promise.reject());
            stubs.delete = sandbox.stub(thread, 'deleteAnnotation');

            thread.on('annotationcreateerror', () => {
                expect(stubs.delete).to.be.called;
                done();
            });

            thread.saveAnnotation('point', 'blah');
            expect(stubs.create).to.be.called;
        });
    });

    describe('updateTemporaryAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                create: () => {}
            };

            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [],
                annotationService,
                fileVersionId: '1',
                location: {},
                threadID: '2',
                threadNumber: '1',
                type: 'point'
            });

            stubs.create = sandbox.stub(annotationService, 'create');
            stubs.saveAnnotationToThread = sandbox.stub(thread, 'saveAnnotationToThread');
        });

        it('should save annotation to thread if it does not exist in annotations array', () => {
            const serverAnnotation = 'real annotation';
            const tempAnnotation = serverAnnotation;

            thread.updateTemporaryAnnotation(tempAnnotation, serverAnnotation);

            expect(stubs.saveAnnotationToThread).to.be.called;
        });

        it('should overwrite a local annotation to the thread if it does exist as an associated annotation', () => {
            const serverAnnotation = 'real annotation';
            const tempAnnotation = 'placeholder annotation';
            const isServerAnnotation = (annotation => (annotation === serverAnnotation));

            thread.annotations.push(tempAnnotation)
            expect(thread.annotations.find(isServerAnnotation)).to.be.undefined;
            thread.updateTemporaryAnnotation(tempAnnotation, serverAnnotation);
            expect(stubs.saveAnnotationToThread).to.not.be.called;
            expect(thread.annotations.find(isServerAnnotation)).to.not.be.undefined;
        });

        it('should emit an annotationsaved event on success', (done) => {
            const serverAnnotation = 'real annotation';
            const tempAnnotation = serverAnnotation;
            thread.addListener('annotationsaved', () => {
                expect(stubs.saveAnnotationToThread).to.be.called;
                done();
            });

            thread.updateTemporaryAnnotation(tempAnnotation, serverAnnotation);
        });
    })

    describe('deleteAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                delete: () => {}
            };

            stubs.annotation = {
                annotationID: 'someID',
                permissions: {
                    can_delete: true
                }
            };

            stubs.annotation2 = {
                annotationID: 'someID2',
                permissions: {
                    can_delete: false
                }
            };

            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [stubs.annotation],
                annotationService,
                fileVersionId: '1',
                isMobile: false,
                location: {},
                threadID: '2',
                threadNumber: '1',
                type: 'point'
            });

            thread.dialog = {
                addListener: () => {},
                addAnnotation: () => {},
                destroy: () => {},
                removeAllListeners: () => {},
                show: () => {},
                hide: () => {},
                removeAnnotation: () => {},
                hideMobileDialog: () => {}
            };
            stubs.dialogMock = sandbox.mock(thread.dialog);

            stubs.delete = sandbox.stub(annotationService, 'delete');
            stubs.isPlain = sandbox.stub(annotatorUtil, 'isPlainHighlight');
            stubs.cancel = sandbox.stub(thread, 'cancelFirstComment');
            stubs.destroy = sandbox.stub(thread, 'destroy');
        });

        it('should destroy the thread if the deleted annotation was the last annotation in the thread', () => {
            thread.isMobile = false;
            stubs.dialogMock.expects('removeAnnotation').never();
            stubs.dialogMock.expects('hideMobileDialog').never();
            thread.deleteAnnotation('someID', false);
            expect(stubs.destroy).to.be.called;
        });

        it('should destroy the thread and hide the mobile dialog if the deleted annotation was the last annotation in the thread on mobile', () => {
            thread.isMobile = true;
            stubs.dialogMock.expects('removeAnnotation');
            stubs.dialogMock.expects('hideMobileDialog');
            thread.deleteAnnotation('someID', false);
        });

        it('should remove the relevant annotation from its dialog if the deleted annotation was not the last one', () => {
            // Add another annotation to thread so 'someID' isn't the only annotation
            thread.annotations.push(stubs.annotation2);
            stubs.dialogMock.expects('removeAnnotation').withArgs('someID');
            thread.deleteAnnotation('someID', false);
        });

        it('should make a server call to delete an annotation with the specified ID if useServer is true', () => {
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.calledWith('someID');
        });

        it('should make also delete blank highlight comment from the server when removing the last comment on a highlight thread', () => {
            stubs.annotation2.permissions.can_delete = false;
            thread.annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.calledWith('someID');
        });

        it('should not make a server call to delete an annotation with the specified ID if useServer is false', () => {
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', false);
            expect(stubs.delete).to.not.be.called;
        });

        it('should broadcast an error if there was an error deleting from server', (done) => {
            stubs.delete.returns(Promise.reject());
            thread.on('annotationdeleteerror', () => {
                done();
            });
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.called;
        });

        it('should toggle highlight dialogs with the delete of the last comment if user does not have permission to delete the entire annotation', () => {
            thread.annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            thread.deleteAnnotation('someID', false);
            expect(stubs.cancel).to.be.called;
            expect(stubs.destroy).to.not.be.called;
        });

        it('should destroy the annotation with the delete of the last comment if the user has permissions', () => {
            stubs.annotation2.permissions.can_delete = true;
            thread.annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            thread.deleteAnnotation('someID', false);
            expect(stubs.cancel).to.not.be.called;
            expect(stubs.destroy).to.be.called;
        });
    });

    describe('scrollIntoView()', () => {
        it('should scroll to annotation page and center annotation in viewport', () => {
            sandbox.stub(thread, 'scrollToPage');
            sandbox.stub(thread, 'centerAnnotation');
            thread.scrollIntoView();
            expect(thread.scrollToPage);
            expect(thread.centerAnnotation).to.be.calledWith(sinon.match.number);
        })
    });

    describe('scrollToPage()', () => {
        it('should scroll annotation\'s page into view', () => {
            const pageEl = {
                scrollIntoView: sandbox.stub()
            };
            thread.annotatedElement = {
                querySelector: sandbox.stub().returns(pageEl)
            };
            thread.scrollToPage();
            expect(pageEl.scrollIntoView).to.be.called;
        });
    });

    describe('centerAnnotation', () => {
        beforeEach(() => {
            thread.annotatedElement = {
                scrollHeight: 100,
                scrollTop: 0,
                scrollBottom: 200
            };
        });

        it('should scroll so annotation is vertically centered in viewport', () => {
            thread.centerAnnotation(50);
            expect(thread.annotatedElement.scrollTop).equals(50);
        });

        it('should scroll so annotation is vertically centered in viewport', () => {
            thread.centerAnnotation(150);
            expect(thread.annotatedElement.scrollTop).equals(200);
        });
    });

    describe('location()', () => {
        it('should get location', () => {
            expect(thread.location).to.equal(thread.location);
        });
    });

    describe('threadID()', () => {
        it('should get threadID', () => {
            expect(thread.threadID).to.equal(thread.threadID);
        });
    });

    describe('thread()', () => {
        it('should get thread', () => {
            expect(thread.thread).to.equal(thread.thread);
        });
    });

    describe('type()', () => {
        it('should get type', () => {
            expect(thread.type).to.equal(thread.type);
        });
    });

    describe('state()', () => {
        it('should get state', () => {
            expect(thread.state).to.equal(thread.state);
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.create = sandbox.stub(thread, 'createDialog');
            stubs.bind = sandbox.stub(thread, 'bindCustomListenersOnDialog');
            stubs.setup = sandbox.stub(thread, 'setupElement');
        });

        it('should setup dialog', () => {
            thread.dialog = {};
            thread.setup();
            expect(stubs.create).to.be.called;
            expect(stubs.bind).to.be.called;
            expect(stubs.setup).to.be.called;
            expect(thread.dialog.isMobile).to.equal(thread.isMobile);
        });

        it('should set state to pending if thread is initialized with no annotations', () => {
            thread.setup();
            expect(thread.state).to.equal(STATES.pending);
        });

        it('should set state to inactive if thread is initialized with annotations', () => {
            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{}],
                annotationService: {},
                fileVersionId: '1',
                isMobile: false,
                location: {},
                threadID: '2',
                threadNumber: '1',
                type: 'point'
            });

            thread.setup();
            expect(thread.state).to.equal(STATES.inactive);
        });
    });

    describe('setupElement()', () => {
        it('should create element and bind listeners', () => {
            stubs.bind = sandbox.stub(thread, 'bindDOMListeners');

            thread.setupElement();
            expect(thread.element instanceof HTMLElement).to.be.true;
            expect(thread.element).to.have.class(CLASS_ANNOTATION_POINT_MARKER);
            expect(stubs.bind).to.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            thread.element = document.createElement('div');
            stubs.add = sandbox.stub(thread.element, 'addEventListener');
            thread.isMobile = false;
        });

        it('should do nothing if element does not exist', () => {
            thread.element = null;
            thread.bindDOMListeners();
            expect(stubs.add).to.not.be.called;
        });

        it('should bind DOM listeners', () => {
            thread.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseleave', sinon.match.func);
        });

        it('should not add mouseleave listener for mobile browsers', () => {
            thread.isMobile = true;
            thread.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.not.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            thread.element = document.createElement('div');
            stubs.remove = sandbox.stub(thread.element, 'removeEventListener');
            thread.isMobile = false;
        });

        it('should do nothing if element does not exist', () => {
            thread.element = null;
            thread.unbindDOMListeners();
            expect(stubs.remove).to.not.be.called;
        });

        it('should unbind DOM listeners', () => {
            thread.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseleave', sinon.match.func);
        });

        it('should not add mouseleave listener for mobile browsers', () => {
            thread.isMobile = true;
            thread.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.not.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('bindCustomListenersOnDialog()', () => {
        it('should do nothing if dialog does not exist', () => {
            thread.dialog = null;
            stubs.dialogMock.expects('addListener').never();
            thread.bindCustomListenersOnDialog();
        });

        it('should bind custom listeners on dialog', () => {
            stubs.dialogMock.expects('addListener').withArgs('annotationcreate', sinon.match.func);
            stubs.dialogMock.expects('addListener').withArgs('annotationcancel', sinon.match.func);
            stubs.dialogMock.expects('addListener').withArgs('annotationdelete', sinon.match.func);
            thread.bindCustomListenersOnDialog();
        });
    });

    describe('unbindCustomListenersOnDialog()', () => {
        it('should do nothing if dialog does not exist', () => {
            thread.dialog = null;
            stubs.dialogMock.expects('removeAllListeners').never();
            thread.unbindCustomListenersOnDialog();
        });

        it('should unbind custom listeners from dialog', () => {
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationcreate');
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationcancel');
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationdelete');
            thread.unbindCustomListenersOnDialog();
        });
    });

    describe('cancelUnsavedAnnotation()', () => {
        it('should only destroy thread if on a mobile browser or in a pending/pending-active state', () => {
            sandbox.stub(thread, 'destroy');

            // mobile
            thread.isMobile = true;
            thread.cancelUnsavedAnnotation();
            expect(thread.destroy).to.be.called;

            // 'pending' state
            thread.isMobile = false;
            thread.state = STATES.pending;
            thread.cancelUnsavedAnnotation();
            expect(thread.destroy).to.be.called;

            // 'pending-active' state
            thread.state = STATES.pending_active;
            thread.cancelUnsavedAnnotation();
            expect(thread.destroy).to.be.called;
        });
    });

    describe('createElement()', () => {
        it('should create an element with the right class and attribute', () => {
            const element = thread.createElement();
            expect(element).to.have.class(CLASS_ANNOTATION_POINT_MARKER);
            expect(element).to.have.attribute('data-type', DATA_TYPE_ANNOTATION_INDICATOR);
        });
    });

    describe('mouseoutHandler()', () => {
        it('should not call hideDialog if there are no annotations in the thread', () => {
            stubs.hide = sandbox.stub(thread, 'hideDialog');
            thread.mouseoutHandler();
            expect(stubs.hide).to.not.be.called;
        });

        it('should call hideDialog if there are annotations in the thread', () => {
            stubs.hide = sandbox.stub(thread, 'hideDialog');
            const annotation = new Annotation({
                fileVersionId: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                threadNumber: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread.annotations = [annotation];
            thread.mouseoutHandler();
            expect(stubs.hide).to.be.called;
        });
    });

    describe('saveAnnotationToThread()', () => {
        it('should push the annotation, and add to the dialog when the dialog exists', () => {
            stubs.add = sandbox.stub(thread.dialog, 'addAnnotation');
            stubs.push = sandbox.stub(thread.annotations, 'push');
            const annotation = new Annotation({
                fileVersionId: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                threadNumber: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread.saveAnnotationToThread(annotation);
            expect(stubs.add).to.be.calledWith(annotation);
            expect(stubs.push).to.be.calledWith(annotation);
        });

        it('should not try to push an annotation to the dialog if it doesn\'t exist', () => {
            stubs.add = sandbox.stub(thread.dialog, 'addAnnotation');
            const annotation = new Annotation({
                fileVersionId: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                threadNumber: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread.dialog = undefined;
            thread.saveAnnotationToThread(annotation);
            expect(stubs.add).to.not.be.called;
        });
    });

    describe('createAnnotationDialog()', () => {
        it('should correctly create the annotation data object', () => {
            const annotationData = thread.createAnnotationData('highlight', 'test');
            expect(annotationData.location).to.equal(thread.location);
            expect(annotationData.fileVersionId).to.equal(thread.fileVersionId);
            expect(annotationData.thread).to.equal(thread.thread);
            expect(annotationData.user.id).to.equal('1');
        });
    });

    describe('createAnnotation()', () => {
        it('should create a new point annotation', () => {
            sandbox.stub(thread, 'saveAnnotation');
            thread.createAnnotation({ text: 'bleh' });
            expect(thread.saveAnnotation).to.be.calledWith(TYPES.point, 'bleh');
        });
    });

    describe('deleteAnnotationWithID()', () => {
        it('should delete a point annotation with the matching annotationID', () => {
            sandbox.stub(thread, 'deleteAnnotation');
            thread.deleteAnnotationWithID({ annotationID: 1 });
            expect(thread.deleteAnnotation).to.be.calledWith(1);
        });
    });
});
