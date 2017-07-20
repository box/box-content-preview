/* eslint-disable no-unused-expressions */
import Annotator from '../Annotator';
import * as annotatorUtil from '../annotatorUtil';
import AnnotationService from '../AnnotationService';
import {
    STATES,
    CLASS_ANNOTATION_POINT_MODE,
    CLASS_ANNOTATION_DRAW_MODE
} from '../annotationConstants';

let annotator;
let stubs = {};
const sandbox = sinon.sandbox.create();

describe('lib/annotations/Annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/Annotator-test.html');

        annotator = new Annotator({
            canAnnotate: true,
            container: document,
            annotationService: {},
            fileVersionId: 1,
            isMobile: false,
            options: {},
            previewUI: {
                getAnnotateButton: () => {}
            }
        });

        stubs.thread = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock = sandbox.mock(stubs.thread);

        stubs.thread2 = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock2 = sandbox.mock(stubs.thread2);

        stubs.thread3 = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock3 = sandbox.mock(stubs.thread3);
        sandbox.stub(annotator, 'emit');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof annotator.destroy === 'function') {
            annotator.destroy();
            annotator = null;
        }

        stubs = {};
    });

    describe('destroy()', () => {
        it('should unbind custom listeners on thread and unbind DOM listeners', () => {
            annotator.threads = {
                1: [stubs.thread]
            };

            const unbindCustomStub = sandbox.stub(annotator, 'unbindCustomListenersOnThread');
            const unbindDOMStub = sandbox.stub(annotator, 'unbindDOMListeners');
            const unbindCustomListenersOnService = sandbox.stub(annotator, 'unbindCustomListenersOnService');

            annotator.destroy();

            expect(unbindCustomStub).to.be.calledWith(stubs.thread);
            expect(unbindDOMStub).to.be.called;
            expect(unbindCustomListenersOnService).to.be.called;
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            const annotatedEl = document.querySelector('.annotated-element');
            sandbox.stub(annotator, 'getAnnotatedEl').returns(annotatedEl);

            stubs.scale = sandbox.stub(annotator, 'setScale');
            stubs.setup = sandbox.stub(annotator, 'setupAnnotations');
            stubs.show = sandbox.stub(annotator, 'showAnnotations');
            stubs.setupMobileDialog = sandbox.stub(annotator, 'setupMobileDialog');
            annotator.canAnnotate = true;
        });

        it('should set scale and setup annotations', () => {
            annotator.init();
            expect(stubs.scale).to.be.called;
            expect(stubs.setup).to.be.called;
            expect(stubs.show).to.be.called;
            expect(annotator.annotationService).to.not.be.null;
        });

        it('should setup mobile dialog for mobile browsers', () => {
            annotator.isMobile = true;
            annotator.init();
            expect(stubs.setupMobileDialog).to.be.called;
        });
    });

    describe('setupMobileDialog()', () => {
        it('should generate mobile annotations dialog and append to container', () => {
            annotator.container = {
                appendChild: sandbox.mock()
            };
            annotator.setupMobileDialog();
            expect(annotator.container.appendChild).to.be.called;
        });
    });

    describe('showAnnotations()', () => {
        it('should fetch and then render annotations', () => {
            const renderStub = sandbox.stub(annotator, 'renderAnnotations');
            const fetchPromise = Promise.resolve();
            const fetchStub = sandbox.stub(annotator, 'fetchAnnotations').returns(fetchPromise);

            annotator.showAnnotations();

            expect(fetchStub).to.be.called;
            return fetchPromise.then(() => {
                expect(renderStub).to.be.called;
            });
        });
    });

    describe('setupAnnotations', () => {
        it('should initialize thread map and bind DOM listeners', () => {
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindCustomListenersOnService');
            sandbox.stub(annotator, 'addListener');

            annotator.setupAnnotations();

            expect(Object.keys(annotator.threads).length === 0).to.be.true;
            expect(annotator.bindDOMListeners).to.be.called;
            expect(annotator.bindCustomListenersOnService).to.be.called;
        });
    });

    describe('once annotator is initialized', () => {
        beforeEach(() => {
            const annotatedEl = document.querySelector('.annotated-element');
            sandbox.stub(annotator, 'getAnnotatedEl').returns(annotatedEl);
            sandbox.stub(annotator, 'setupAnnotations');
            sandbox.stub(annotator, 'showAnnotations');

            annotator.threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.init();
        });

        describe('hideAnnotations()', () => {
            it('should call hide on each thread in map', () => {
                stubs.threadMock.expects('hide');
                stubs.threadMock2.expects('hide');
                stubs.threadMock3.expects('hide');
                annotator.hideAnnotations();
            });
        });

        describe('hideAnnotationsOnPage()', () => {
            it('should call hide on each thread in map on page 1', () => {
                stubs.threadMock.expects('hide');
                stubs.threadMock2.expects('hide').never();
                stubs.threadMock3.expects('hide').never();
                annotator.hideAnnotationsOnPage('1');
            });
        });

        describe('renderAnnotations()', () => {
            it('should call show on each thread', () => {
                stubs.threadMock.expects('show');
                stubs.threadMock2.expects('show');
                stubs.threadMock3.expects('show');
                annotator.renderAnnotations();
            });
        });

        describe('renderAnnotationsOnPage()', () => {
            it('should call show on each thread', () => {
                stubs.thread2.location = { page: 2 };
                stubs.thread3.location = { page: 2 };

                stubs.threadMock.expects('show');
                stubs.threadMock2.expects('show').never();
                stubs.threadMock3.expects('show').never();
                annotator.renderAnnotationsOnPage('1');
            });
        });

        describe('rotateAnnotations()', () => {
            beforeEach(() => {
                annotator.annotationService = {
                    canAnnotate: true
                };
                stubs.hide = sandbox.stub(annotatorUtil, 'hideElement');
                stubs.show = sandbox.stub(annotatorUtil, 'showElement');
                stubs.render = sandbox.stub(annotator, 'renderAnnotations');
            });

            it('should only render annotations if user cannot annotate', () => {
                annotator.annotationService.canAnnotate = false;
                annotator.rotateAnnotations();
                expect(stubs.hide).to.not.be.called;
                expect(stubs.show).to.not.be.called;
                expect(stubs.render).to.be.called;
            });

            it('should hide point annotation button if image is rotated', () => {
                annotator.rotateAnnotations(90);
                expect(stubs.hide).to.be.called;
                expect(stubs.show).to.not.be.called;
                expect(stubs.render).to.be.called;
            });

            it('should show point annotation button if image is rotated', () => {
                annotator.rotateAnnotations();
                expect(stubs.hide).to.not.be.called;
                expect(stubs.show).to.be.called;
                expect(stubs.render).to.be.called;
            });
        });

        describe('setScale()', () => {
            it('should set a data-scale attribute on the annotated element', () => {
                annotator.setScale(10);
                const annotatedEl = document.querySelector('.annotated-element');
                expect(annotatedEl).to.have.attribute('data-scale', '10');
            });
        });

        describe('togglePointAnnotationHandler()', () => {
            beforeEach(() => {
                stubs.pointMode = sandbox.stub(annotator, 'isInPointMode');
                sandbox.stub(annotator.notification, 'show');
                sandbox.stub(annotator.notification, 'hide');
                sandbox.stub(annotator, 'unbindDOMListeners');
                sandbox.stub(annotator, 'bindDOMListeners');
                sandbox.stub(annotator, 'bindPointModeListeners');
                sandbox.stub(annotator, 'unbindModeListeners');
            });

            it('should turn point annotation mode on if it is off', () => {
                const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.pointMode.returns(false);

                annotator.togglePointAnnotationHandler();

                const annotatedEl = document.querySelector('.annotated-element');
                expect(destroyStub).to.be.called;
                expect(annotator.notification.show).to.be.called;
                expect(annotator.emit).to.be.calledWith('annotationmodeenter');
                expect(annotatedEl).to.have.class(CLASS_ANNOTATION_POINT_MODE);
                expect(annotator.unbindDOMListeners).to.be.called;
                expect(annotator.bindPointModeListeners).to.be.called;
            });

            it('should turn point annotation mode off if it is on', () => {
                const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.pointMode.returns(true);

                annotator.togglePointAnnotationHandler();

                const annotatedEl = document.querySelector('.annotated-element');
                expect(destroyStub).to.be.called;
                expect(annotator.notification.hide).to.be.called;
                expect(annotator.emit).to.be.calledWith('annotationmodeexit');
                expect(annotatedEl).to.not.have.class(CLASS_ANNOTATION_POINT_MODE);
                expect(annotator.unbindModeListeners).to.be.called;
                expect(annotator.bindDOMListeners).to.be.called;
            });
        });

        describe('toggleDrawAnnotationHandler()', () => {
            beforeEach(() => {
                stubs.drawMode = sandbox.stub(annotator, 'isInDrawMode');
                sandbox.stub(annotator.notification, 'show');
                sandbox.stub(annotator.notification, 'hide');
                sandbox.stub(annotator, 'unbindDOMListeners');
                sandbox.stub(annotator, 'bindDOMListeners');
                sandbox.stub(annotator, 'bindDrawModeListeners');
                sandbox.stub(annotator, 'unbindModeListeners');
                sandbox.stub(annotator, 'createAnnotationThread');
            });

            it('should turn draw annotation mode on if it is off', () => {
                const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.drawMode.returns(false);

                annotator.toggleDrawAnnotationHandler();

                const annotatedEl = document.querySelector('.annotated-element');
                expect(destroyStub).to.be.called;
                expect(annotator.notification.show).to.be.called;
                expect(annotator.emit).to.be.calledWith('annotationmodeenter');
                expect(annotatedEl).to.have.class(CLASS_ANNOTATION_DRAW_MODE);
                expect(annotator.unbindDOMListeners).to.be.called;
                expect(annotator.bindDrawModeListeners).to.be.called;
                expect(annotator.createAnnotationThread).to.be.calledWith([], {}, 'draw');
            });

            it('should turn annotation mode off if it is on', () => {
                const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.drawMode.returns(true);

                annotator.toggleDrawAnnotationHandler();

                const annotatedEl = document.querySelector('.annotated-element');
                expect(destroyStub).to.be.called;
                expect(annotator.notification.hide).to.be.called;
                expect(annotator.emit).to.be.calledWith('annotationmodeexit');
                expect(annotatedEl).to.not.have.class(CLASS_ANNOTATION_DRAW_MODE);
                expect(annotator.unbindModeListeners).to.be.called;
                expect(annotator.bindDOMListeners).to.be.called;
            });
        });

        describe('fetchAnnotations', () => {
            beforeEach(() => {
                annotator.annotationService = {
                    getThreadMap: () => {}
                };
                stubs.serviceMock = sandbox.mock(annotator.annotationService);

                const threadMap = {
                    someID: [{}, {}],
                    someID2: [{}]
                };
                stubs.threadPromise = Promise.resolve(threadMap);
                stubs.serviceMock.expects('getThreadMap').returns(stubs.threadPromise);
            });

            it('should reset and create a new thread map by fetching annotation data from the server', () => {
                stubs.createThread = sandbox.stub(annotator, 'createAnnotationThread');
                stubs.createThread.onFirstCall();
                stubs.createThread.onSecondCall().returns(stubs.thread);
                sandbox.stub(annotator, 'bindCustomListenersOnThread');

                const result = annotator.fetchAnnotations();
                return stubs.threadPromise.then(() => {
                    expect(Object.keys(annotator.threads).length === 0).to.be.true;
                    expect(annotator.createAnnotationThread).to.be.calledTwice;
                    expect(annotator.bindCustomListenersOnThread).to.be.calledOnce;
                    expect(result).to.be.an.object;
                });
            });

            it('should emit a message to indicate that all annotations have been fetched', () => {
                annotator.fetchAnnotations();
                return stubs.threadPromise.then(() => {
                    expect(annotator.emit).to.be.calledWith('annotationsfetched');
                });
            });
        });

        describe('bindCustomListenersOnService', () => {
            it('should do nothing if the service does not exist', () => {
                annotator.annotationService = {
                    addListener: sandbox.stub()
                };

                annotator.bindCustomListenersOnService();
                expect(annotator.annotationService.addListener).to.not.be.called;
            });

            it('should add an event listener', () => {
                annotator.annotationService = new AnnotationService({
                    apiHost: 'API',
                    fileId: 1,
                    token: 'someToken',
                    canAnnotate: true,
                    canDelete: true
                });
                const addListenerStub = sandbox.stub(annotator.annotationService, 'addListener');

                annotator.bindCustomListenersOnService();
                expect(addListenerStub).to.be.calledWith('annotationerror', sinon.match.func);
            });
        });

        describe('unbindCustomListenersOnService', () => {
            it('should do nothing if the service does not exist', () => {
                annotator.annotationService = {
                    removeListener: sandbox.stub()
                };

                annotator.unbindCustomListenersOnService();
                expect(annotator.annotationService.removeListener).to.not.be.called;
            });

            it('should remove an event listener', () => {
                annotator.annotationService = new AnnotationService({
                    apiHost: 'API',
                    fileId: 1,
                    token: 'someToken',
                    canAnnotate: true,
                    canDelete: true
                });
                const removeListenerStub = sandbox.stub(annotator.annotationService, 'removeAllListeners');

                annotator.unbindCustomListenersOnService();
                expect(removeListenerStub).to.be.called;
            });
        });

        describe('bindCustomListenersOnThread', () => {
            it('should bind custom listeners on the thread', () => {
                stubs.threadMock.expects('addListener').withArgs('threaddeleted', sinon.match.func);
                stubs.threadMock.expects('addListener').withArgs('threadcleanup', sinon.match.func);
                annotator.bindCustomListenersOnThread(stubs.thread);
            });
        });

        describe('unbindCustomListenersOnThread', () => {
            it('should unbind custom listeners from the thread', () => {
                stubs.threadMock.expects('removeAllListeners').withArgs('threaddeleted');
                stubs.threadMock.expects('removeAllListeners').withArgs('threadcleanup');
                annotator.unbindCustomListenersOnThread(stubs.thread);
            });
        });

        describe('bindPointModeListeners', () => {
            it('should bind point mode click handler', () => {
                sandbox.stub(annotator.annotatedElement, 'addEventListener');
                sandbox.stub(annotator.annotatedElement, 'removeEventListener');
                sandbox.stub(annotator.pointClickHandler, 'bind', () => annotator.pointClickHandler);

                annotator.bindPointModeListeners();
                expect(annotator.pointClickHandler.bind).to.be.called;
                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    'click',
                    annotator.pointClickHandler
                );
            });
        });

        describe('unbindModeListeners()', () => {
            it('should unbind point mode click handler', () => {
                sandbox.stub(annotator.annotatedElement, 'removeEventListener');
                sandbox.stub(annotator.pointClickHandler, 'bind', () => annotator.pointClickHandler);

                annotator.bindPointModeListeners();
                annotator.unbindModeListeners();
                expect(annotator.pointClickHandler.bind).to.be.called;
                expect(annotator.annotatedElement.removeEventListener).to.be.calledWith(
                    'click',
                    annotator.pointClickHandler
                );
            });

            it('should unbind draw mode click handler', () => {
                const drawingThread = {
                    handleStart: () => {
                        bind: handleStart
                    },
                    handleStop: () => {
                        bind: handleStop
                    },
                    handleMove: () => {
                        bind: handleMove
                    }
                };
                const postButtonEl = {
                    addEventListener: sandbox.stub(),
                    removeEventListener: sandbox.stub()
                };

                sandbox.stub(annotator.annotatedElement, 'addEventListener');
                sandbox.stub(annotator.annotatedElement, 'removeEventListener');

                annotator.bindDrawModeListeners(drawingThread, postButtonEl);
                annotator.unbindModeListeners();
                expect(annotator.annotatedElement.addEventListener).to.be.called.thrice;
                expect(postButtonEl.addEventListener).to.be.called;
                expect(annotator.annotatedElement.removeEventListener).to.be.calledWith(
                    sinon.match.string,
                    sinon.match.func
                ).thrice;
                expect(postButtonEl.removeEventListener).to.be.called;
            });
        });

        describe('pointClickHandler()', () => {
            const event = {
                stopPropagation: () => {}
            };

            beforeEach(() => {
                stubs.destroy = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.create = sandbox.stub(annotator, 'createAnnotationThread');
                stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent');
                sandbox.stub(annotator, 'bindCustomListenersOnThread');
                sandbox.stub(annotator, 'togglePointAnnotationHandler');
            });

            it('should not do anything if there are pending threads', () => {
                stubs.destroy.returns(true);
                stubs.create.returns(stubs.thread);

                stubs.threadMock.expects('show').never();
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.not.be.called;
                expect(annotator.bindCustomListenersOnThread).to.not.be.called;
                expect(annotator.togglePointAnnotationHandler).to.not.be.called;
            });

            it('should not do anything if thread is invalid', () => {
                stubs.destroy.returns(false);

                stubs.threadMock.expects('show').never();
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.togglePointAnnotationHandler).to.be.called;
                expect(annotator.bindCustomListenersOnThread).to.not.be.called;
            });

            it('should not create a thread if a location object cannot be inferred from the event', () => {
                stubs.destroy.returns(false);
                stubs.getLocation.returns(null);
                stubs.create.returns(stubs.thread);

                stubs.threadMock.expects('show').never();
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.bindCustomListenersOnThread).to.not.be.called;
                expect(annotator.togglePointAnnotationHandler).to.be.called;
            });

            it('should create, show, and bind listeners to a thread', () => {
                stubs.destroy.returns(false);
                stubs.getLocation.returns({});
                stubs.create.returns(stubs.thread);

                stubs.threadMock.expects('show');
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.bindCustomListenersOnThread).to.be.called;
                expect(annotator.togglePointAnnotationHandler).to.be.called;
            });
        });

        describe('bindDrawModeListeners', () => {
            it('should do nothing if neither a thread nor a post button is not provided', () => {
                const drawingThread = {
                    handleStart: () => {},
                    handleStop: () => {
                        bind: handleStop
                    },
                    handleMove: () => {
                        bind: handleMove
                    }
                };

                sandbox.stub(drawingThread.handleStart, 'bind').returns(drawingThread.handleStart)
                sandbox.stub(annotator, 'getLocationFromEvent');

                annotator.bindDrawModeListeners(null, 'A real button');
                expect(annotator.getLocationFromEvent).to.not.be.called;

                annotator.bindDrawModeListeners(drawingThread, null);
                expect(drawingThread.handleStart.bind).to.not.be.called;
            });

            it('should bind draw mode click handler', () => {
                const drawingThread = {
                    handleStart: () => {},
                    handleStop: () => {},
                    handleMove: () => {}
                };
                const postButtonEl = {
                    addEventListener: sandbox.stub(),
                    removeEventListener: sandbox.stub()
                };
                const locationHandler = (() => {});

                sandbox.stub(annotator.annotatedElement, 'addEventListener');
                sandbox.stub(annotator.annotatedElement, 'removeEventListener');
                sandbox.stub(annotator, 'isInDrawMode').returns(true);
                sandbox.stub(drawingThread.handleStart, 'bind', () => drawingThread.pointClickHandler);
                sandbox.stub(drawingThread.handleStop, 'bind', () => drawingThread.pointClickHandler);
                sandbox.stub(drawingThread.handleMove, 'bind', () => drawingThread.pointClickHandler);
                sandbox.stub(annotatorUtil, 'eventToLocationHandler').returns(locationHandler);

                annotator.bindDrawModeListeners(drawingThread, postButtonEl);

                expect(drawingThread.handleStart.bind).to.be.called;
                expect(drawingThread.handleStop.bind).to.be.called;
                expect(drawingThread.handleMove.bind).to.be.called;
                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    sinon.match.string,
                    locationHandler
                ).thrice;
                expect(postButtonEl.addEventListener).to.be.calledWith(
                    'click',
                    sinon.match.func
                );
            });
        });

        describe('addToThreadMap', () => {
            it('should add valid threads to the thread map', () => {
                stubs.thread.location = { page: 2 };
                stubs.thread2.location = { page: 3 };
                stubs.thread3.location = { page: 2 };

                annotator.threads = {};
                annotator.addThreadToMap(stubs.thread);

                expect(annotator.threads).to.deep.equal({
                    2: [stubs.thread]
                });

                annotator.addThreadToMap(stubs.thread2);
                annotator.addThreadToMap(stubs.thread3);

                expect(annotator.threads).to.deep.equal({
                    2: [stubs.thread, stubs.thread3],
                    3: [stubs.thread2]
                });
            });
        });

        describe('isInPointMode', () => {
            it('should return whether the annotator is in point mode or not', () => {
                annotator.annotatedElement.classList.add(CLASS_ANNOTATION_POINT_MODE);
                expect(annotator.isInPointMode()).to.be.true;

                annotator.annotatedElement.classList.remove(CLASS_ANNOTATION_POINT_MODE);
                expect(annotator.isInPointMode()).to.be.false;
            });
        });

        describe('isInDrawMode', () => {
            it('should return whether the annotator is in draw mode or not', () => {
                annotator.annotatedElement.classList.add(CLASS_ANNOTATION_DRAW_MODE);
                expect(annotator.isInDrawMode()).to.be.true;

                annotator.annotatedElement.classList.remove(CLASS_ANNOTATION_DRAW_MODE);
                expect(annotator.isInDrawMode()).to.be.false;
            });
        });

        describe('destroyPendingThreads', () => {
            beforeEach(() => {
                stubs.thread = {
                    location: { page: 2 },
                    type: 'type',
                    state: STATES.pending,
                    destroy: () => {},
                    unbindCustomListenersOnThread: () => {},
                    removeAllListeners: () => {}
                };
                stubs.threadMock = sandbox.mock(stubs.thread);
            });

            it('should destroy and return true if there are any pending threads', () => {
                annotator.init();
                annotator.addThreadToMap(stubs.thread);
                stubs.threadMock.expects('destroy');
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(true);
            });

            it('should not destroy and return false if there are no threads', () => {
                annotator.init();
                stubs.threadMock.expects('destroy').never();
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(false);
            });

            it('should not destroy and return false if the threads are not pending', () => {
                stubs.thread.state = 'NOT_PENDING';
                annotator.init();
                annotator.addThreadToMap(stubs.thread);
                stubs.threadMock.expects('destroy').never();
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(false);
            });

            it('should destroy only pending threads, and return true', () => {
                stubs.thread.state = 'NOT_PENDING';
                const pendingThread = {
                    location: { page: 2 },
                    type: 'type',
                    state: STATES.pending,
                    destroy: () => {},
                    unbindCustomListenersOnThread: () => {},
                    removeAllListeners: () => {}
                };
                stubs.pendingMock = sandbox.mock(pendingThread);

                annotator.init();
                annotator.addThreadToMap(stubs.thread);
                annotator.addThreadToMap(pendingThread);

                stubs.threadMock.expects('destroy').never();
                stubs.pendingMock.expects('destroy');
                const destroyed = annotator.destroyPendingThreads();

                expect(destroyed).to.equal(true);
            });
        });

        describe('handleValidationError()', () => {
            it('should do nothing if a validation notification was already displayed', () => {
                annotator.validationErrorDisplayed = true;
                stubs.showNotification = sandbox.stub(annotator.notification, 'show');
                annotator.handleValidationError();
                expect(stubs.showNotification).to.not.be.called;
                expect(annotator.validationErrorDisplayed).to.be.true;
            });

            it('should display validation error notification on first error', () => {
                annotator.validationErrorDisplayed = false;
                stubs.showNotification = sandbox.stub(annotator.notification, 'show');
                annotator.handleValidationError();
                expect(stubs.showNotification).to.be.called;
                expect(annotator.validationErrorDisplayed).to.be.true;
            });
        });
    });
});
