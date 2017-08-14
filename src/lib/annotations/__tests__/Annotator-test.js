/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import Annotator from '../Annotator';
import * as annotatorUtil from '../annotatorUtil';
import AnnotationService from '../AnnotationService';
import {
    STATES,
    TYPES,
    CLASS_ANNOTATION_DRAW_MODE,
    CLASS_HIDDEN
} from '../annotationConstants';

let annotator;
let stubs = {};
const sandbox = sinon.sandbox.create();

const MODE_ENTER = 'annotationmodeenter';
const MODE_EXIT= 'annotationmodeexit';

describe('lib/annotations/Annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/Annotator-test.html');

        const options = {
            annotator: {
                NAME: 'name'
            }
        };
        annotator = new Annotator({
            canAnnotate: true,
            container: document,
            annotationService: {},
            fileVersionId: 1,
            isMobile: false,
            options,
            previewUI: {
                getAnnotateButton: () => {}
            },
            modeButtons: {}
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
            const unbindScaleListener = sandbox.stub(annotator, 'removeListener');

            annotator.destroy();

            expect(unbindCustomStub).to.be.calledWith(stubs.thread);
            expect(unbindDOMStub).to.be.called;
            expect(unbindCustomListenersOnService).to.be.called;
            expect(unbindScaleListener).to.be.calledWith('scaleAnnotations', sinon.match.func);
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            const annotatedEl = document.querySelector('.annotated-element');
            sandbox.stub(annotator, 'getAnnotatedEl').returns(annotatedEl);
            annotator.annotatedElement = annotatedEl;

            stubs.scale = sandbox.stub(annotator, 'setScale');
            stubs.setup = sandbox.stub(annotator, 'setupAnnotations');
            stubs.show = sandbox.stub(annotator, 'showAnnotations');
            stubs.setupMobileDialog = sandbox.stub(annotator, 'setupMobileDialog');
            stubs.showButton = sandbox.stub(annotator, 'showModeAnnotateButton');

            annotator.canAnnotate = true;
            annotator.modeButtons = {
                point: { selector: 'point_btn' },
                draw: { selector: 'draw_btn' }
            };
        });

        afterEach(() => {
            annotator.modeButtons = {};
        });

        it('should set scale and setup annotations', () => {
            annotator.init(5);
            expect(stubs.scale).to.be.calledWith(5);
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

    describe('setupAnnotations()', () => {
        it('should initialize thread map and bind DOM listeners', () => {
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindCustomListenersOnService');
            sandbox.stub(annotator, 'addListener');

            annotator.setupAnnotations();

            expect(Object.keys(annotator.threads).length === 0).to.be.true;
            expect(annotator.bindDOMListeners).to.be.called;
            expect(annotator.bindCustomListenersOnService).to.be.called;
            expect(annotator.addListener).to.be.calledWith('scaleAnnotations', sinon.match.func);
        });
    });

    describe('once annotator is initialized', () => {
        beforeEach(() => {
            const annotatedEl = document.querySelector('.annotated-element');
            annotator.annotatedElement = annotatedEl;
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
                annotator.canAnnotate = true;
                stubs.hide = sandbox.stub(annotatorUtil, 'hideElement');
                stubs.show = sandbox.stub(annotatorUtil, 'showElement');
                stubs.render = sandbox.stub(annotator, 'renderAnnotations');

                annotator.modeButtons = {
                    point: { selector: 'point_btn' },
                    draw: { selector: 'draw_btn' }
                };
            });

            afterEach(() => {
                annotator.modeButtons = {};
            });

            it('should only render annotations if user cannot annotate', () => {
                annotator.canAnnotate = false;
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

        describe('toggleAnnotationHandler()', () => {
            beforeEach(() => {
                stubs.destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.annotationMode = sandbox.stub(annotator, 'isInAnnotationMode');
                stubs.exitModes = sandbox.stub(annotator, 'exitAnnotationModes');
                stubs.disable = sandbox.stub(annotator, 'disableAnnotationMode');
                stubs.enable = sandbox.stub(annotator, 'enableAnnotationMode');
                sandbox.stub(annotator.previewUI, 'getAnnotateButton');

                annotator.modeButtons = {
                    point: { selector: 'point_btn' },
                    draw: { selector: 'draw_btn' }
                };
            });

            afterEach(() => {
                annotator.modeButtons = {};
            });

            it('should do nothing if specified annotation type does not have a mode button', () => {
                annotator.toggleAnnotationHandler(TYPES.highlight);
                expect(stubs.destroyStub).to.be.called;
                expect(stubs.exitAnnotationModes)
            });

            it('should turn annotation mode on if it is off', () => {
                stubs.annotationMode.returns(false);

                annotator.toggleAnnotationHandler(TYPES.point);

                expect(stubs.destroyStub).to.be.called;
                expect(stubs.exitModes).to.be.called;
                expect(stubs.enable).to.be.called;
            });

            it('should turn annotation mode off if it is on', () => {
                stubs.annotationMode.returns(true);

                annotator.toggleAnnotationHandler(TYPES.point);

                expect(stubs.destroyStub).to.be.called;
                expect(stubs.exitModes).to.be.called;
                expect(stubs.disable).to.be.called;
            });
        });

        describe('fetchAnnotations()', () => {
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
                sandbox.stub(annotator, 'emit');
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
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
                    expect(annotator.bindCustomListenersOnThread).to.be.calledTwice;
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

        describe('bindCustomListenersOnService()', () => {
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
                expect(addListenerStub).to.be.calledWith('annotatorerror', sinon.match.func);
            });
        });

        describe('handleServiceEvents()', () => {
            beforeEach(() => {
                sandbox.stub(annotator, 'emit');
            });

            it('should emit annotatorerror on read error event', () => {
                annotator.handleServiceEvents({ reason: 'read' });
                expect(annotator.emit).to.be.calledWith('annotatorerror', sinon.match.string);
            });

            it('should emit annotatorerror and show annotations on create error event', () => {
                annotator.handleServiceEvents({ reason: 'create' });
                expect(annotator.emit).to.be.calledWith('annotatorerror', sinon.match.string);
                expect(annotator.showAnnotations).to.be.called;
            });

            it('should emit annotatorerror and show annotations on delete error event', () => {
                annotator.handleServiceEvents({ reason: 'delete' });
                expect(annotator.emit).to.be.calledWith('annotatorerror', sinon.match.string);
                expect(annotator.showAnnotations).to.be.called;
            });

            it('should emit annotatorerror on authorization error event', () => {
                annotator.handleServiceEvents({ reason: 'authorization' });
                expect(annotator.emit).to.be.calledWith('annotatorerror', sinon.match.string);
            });

            it('should not emit annotatorerror when event does not match', () => {
                annotator.handleServiceEvents({ reason: 'no match' });
                expect(annotator.emit).to.not.be.called;
            });
        });

        describe('unbindCustomListenersOnService()', () => {
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

        describe('bindCustomListenersOnThread()', () => {
            it('should bind custom listeners on the thread', () => {
                stubs.threadMock.expects('addListener').withArgs('threaddeleted', sinon.match.func);
                stubs.threadMock.expects('addListener').withArgs('threadcleanup', sinon.match.func);
                annotator.bindCustomListenersOnThread(stubs.thread);
            });

            it('should do nothing when given thread is empty', () => {
                expect(annotator.bindCustomListenersOnThread).to.not.throw(undefined);
                expect(annotator.bindCustomListenersOnThread).to.not.throw(null);
            })
        });

        describe('unbindCustomListenersOnThread()', () => {
            it('should unbind custom listeners from the thread', () => {
                stubs.threadMock.expects('removeAllListeners').withArgs('threaddeleted');
                stubs.threadMock.expects('removeAllListeners').withArgs('threadcleanup');
                annotator.unbindCustomListenersOnThread(stubs.thread);
            });
        });

        describe('bindModeListeners()', () => {
            let drawingThread;

            beforeEach(() => {
                annotator.annotatedElement = {
                    addEventListener: sandbox.stub(),
                    removeEventListener: sandbox.stub()
                };

                drawingThread = {
                    handleStart: () => {},
                    handleStop: () => {},
                    handleMove: () => {},
                    addListener: sandbox.stub()
                };
            });

            it('should get event handlers for point annotation mode', () => {
                annotator.bindModeListeners(TYPES.point);
                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    'mousedown',
                    annotator.pointClickHandler
                );
                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    'touchstart',
                    annotator.pointClickHandler
                );
                expect(annotator.annotationModeHandlers.length).equals(2);
            });

            it('should bind draw mode handlers', () => {
                sandbox.stub(annotator, 'createAnnotationThread').returns(drawingThread);

                const postButtonEl = {
                    addEventListener: sandbox.stub(),
                    removeEventListener: sandbox.stub()
                };
                sandbox.stub(annotator.previewUI, 'getAnnotateButton').returns(null);
                const locationHandler = (() => {});

                sandbox.stub(annotatorUtil, 'eventToLocationHandler').returns(locationHandler);

                annotator.bindModeListeners(TYPES.draw);

                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    sinon.match.string,
                    locationHandler
                ).thrice;
                expect(postButtonEl.addEventListener).to.not.be.calledWith(
                    'click',
                    sinon.match.func
                );
                expect(annotator.annotationModeHandlers.length).equals(3);
            });

            it('should bind draw mode click handlers if post button exists', () => {
                sandbox.stub(annotator, 'createAnnotationThread').returns(drawingThread);

                const postButtonEl = {
                    addEventListener: sandbox.stub(),
                    removeEventListener: sandbox.stub()
                };
                sandbox.stub(annotator.previewUI, 'getAnnotateButton').returns(postButtonEl);
                const locationHandler = (() => {});

                sandbox.stub(annotatorUtil, 'eventToLocationHandler').returns(locationHandler);

                annotator.bindModeListeners(TYPES.draw);

                expect(annotator.annotatedElement.addEventListener).to.be.calledWith(
                    sinon.match.string,
                    locationHandler
                ).thrice;
                expect(postButtonEl.addEventListener).to.be.calledWith(
                    'click',
                    sinon.match.func
                );
                expect(annotator.annotationModeHandlers.length).equals(4);
            });
        });

        describe('unbindModeListeners()', () => {
            it('should unbind mode handlers', () => {
                sandbox.stub(annotator.annotatedElement, 'removeEventListener');
                annotator.annotationModeHandlers = [
                    {
                        type: 'event1',
                        func: () => {},
                        eventObj: annotator.annotatedElement
                    },
                    {
                        type: 'event2',
                        func: () => {},
                        eventObj: annotator.annotatedElement
                    }
                ];

                annotator.unbindModeListeners();
                expect(annotator.annotatedElement.removeEventListener).to.be.calledWith(
                    'event1',
                    sinon.match.func
                );
                expect(annotator.annotatedElement.removeEventListener).to.be.calledWith(
                    'event2',
                    sinon.match.func
                );
            });
        });

        describe('pointClickHandler()', () => {
            const event = {
                stopPropagation: () => {},
                preventDefault: () => {}
            };

            beforeEach(() => {
                stubs.destroy = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.create = sandbox.stub(annotator, 'createAnnotationThread');
                stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent');
                sandbox.stub(annotator, 'bindCustomListenersOnThread');
                sandbox.stub(annotator, 'disableAnnotationMode');
                annotator.modeButtons = {
                    point: {
                        title: 'Point Annotation Mode',
                        selector: '.bp-btn-annotate'
                    }
                };
            });

            afterEach(() => {
                annotator.modeButtons = {};
                annotator.container = document;
            });

            it('should not do anything if there are pending threads', () => {
                stubs.destroy.returns(true);
                stubs.create.returns(stubs.thread);

                stubs.threadMock.expects('show').never();
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.not.be.called;
                expect(annotator.bindCustomListenersOnThread).to.not.be.called;
                expect(annotator.disableAnnotationMode).to.not.be.called;
            });

            it('should not do anything if thread is invalid', () => {
                stubs.destroy.returns(false);

                stubs.threadMock.expects('show').never();
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.disableAnnotationMode).to.be.called;
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
                expect(annotator.disableAnnotationMode).to.be.called;
            });

            it('should create, show, and bind listeners to a thread', () => {
                stubs.destroy.returns(false);
                stubs.getLocation.returns({});
                stubs.create.returns(stubs.thread);

                stubs.threadMock.expects('show');
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.bindCustomListenersOnThread).to.be.called;
                expect(annotator.disableAnnotationMode).to.be.called;
            });
        });

        describe('addToThreadMap()', () => {
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

        describe('isInAnnotationMode()', () => {
            it('should return whether the annotator is in specified annotation mode or not', () => {
                annotator.currentAnnotationMode = TYPES.draw;
                expect(annotator.isInAnnotationMode(TYPES.draw)).to.be.true;

                annotator.currentAnnotationMode = TYPES.point;
                expect(annotator.isInAnnotationMode(TYPES.draw)).to.be.false;
            });
        });

        describe('scaleAnnotations()', () => {
            it('should set scale and rotate annotations based on the annotated element', () => {
                sandbox.stub(annotator, 'setScale');
                sandbox.stub(annotator, 'rotateAnnotations');

                const data = {
                    scale: 5,
                    rotationAngle: 90,
                    pageNum: 2
                };
                annotator.scaleAnnotations(data);
                expect(annotator.setScale).to.be.calledWith(data.scale);
                expect(annotator.rotateAnnotations).to.be.calledWith(data.rotationAngle, data.pageNum);
            });
        });

        describe('destroyPendingThreads()', () => {
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
            it('should do nothing if a annotatorerror was already emitted', () => {
                sandbox.stub(annotator, 'emit');
                annotator.validationErrorEmitted = true;
                annotator.handleValidationError();
                expect(annotator.emit).to.not.be.calledWith('annotatorerror');
                expect(annotator.validationErrorEmitted).to.be.true;
            });

            it('should emit annotatorerror on first error', () => {
                sandbox.stub(annotator, 'emit');
                annotator.validationErrorEmitted = false;
                annotator.handleValidationError();
                expect(annotator.emit).to.be.calledWith('annotatorerror', sinon.match.string);
                expect(annotator.validationErrorEmitted).to.be.true;
            });
        });

        describe('emit()', () => {
            const emitFunc = EventEmitter.prototype.emit;

            afterEach(() => {
                Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitFunc });
            });

            it('should pass through the event as well as broadcast it as a annotator event', () => {
                const fileId = '1';
                const event = 'someEvent';
                const data = {};
                const annotatorName = 'name';

                annotator = new Annotator({
                    canAnnotate: true,
                    container: document,
                    annotationService: {},
                    fileVersionId: 1,
                    isMobile: false,
                    options: {
                        annotator: { NAME: annotatorName },
                        fileId
                    },
                    previewUI: {
                        getAnnotateButton: sandbox.stub()
                    },
                    modeButtons: {}
                });

                const emitStub = sandbox.stub();
                Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitStub });

                annotator.emit(event, data);

                expect(emitStub).to.be.calledWith(event, data);
                expect(emitStub).to.be.calledWithMatch('annotatorevent', {
                    event,
                    data,
                    annotatorName,
                    fileId
                });
            });
        });

        describe('isModeAnnotatable()', () => {
            beforeEach(() => {
                annotator.options.annotator = {
                    TYPE: [TYPES.point, 'highlight']
                };
            });

            it('should return false if annotations are not allowed on the current viewer', () => {
                annotator.options.annotator = undefined;
                expect(annotator.isModeAnnotatable(TYPES.point)).to.equal(false);
            })

            it('should return true if the type is supported by the viewer', () => {
                expect(annotator.isModeAnnotatable(TYPES.point)).to.equal(true);
            });

            it('should return false if the type is not supported by the viewer', () => {
                expect(annotator.isModeAnnotatable('drawing')).to.equal(false);
            });
        });

        describe('showModeAnnotateButton()', () => {
            beforeEach(() => {
                annotator.modeButtons = {
                    point: {
                        title: 'Point Annotation Mode',
                        selector: '.bp-btn-annotate'
                    }
                };
            });

            afterEach(() => {
                annotator.modeButtons = {};
                annotator.container = document;
            });

            it('should do nothing if the mode does not require a button', () => {
                sandbox.stub(annotator, 'getAnnotationModeClickHandler');
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                annotator.showModeAnnotateButton(TYPES.highlight);
                expect(annotator.getAnnotationModeClickHandler).to.not.be.called;
            });

            it('should do nothing if the annotation type is not supported ', () => {
                sandbox.stub(annotator, 'getAnnotationModeClickHandler');
                sandbox.stub(annotator, 'isModeAnnotatable').returns(false);
                annotator.showModeAnnotateButton('bleh');
                expect(annotator.getAnnotationModeClickHandler).to.not.be.called;
            });

            it('should do nothing if the button is not in the container', () => {
                annotator.modeButtons = {
                    point: {
                        title: 'Point Annotation Mode',
                        selector: 'wrong-selector'
                    }
                };
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                sandbox.stub(annotator, 'getAnnotationModeClickHandler');
                annotator.showModeAnnotateButton(TYPES.point);
                expect(annotator.getAnnotationModeClickHandler).to.not.be.called;
            });

            it('should set up and show an annotate button', () => {
                const buttonEl = annotator.container.querySelector('.bp-btn-annotate');
                buttonEl.classList.add('point-selector');
                buttonEl.classList.add(CLASS_HIDDEN);

                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                sandbox.stub(annotator, 'getAnnotationModeClickHandler');
                sandbox.mock(buttonEl).expects('addEventListener').withArgs('click');

                annotator.showModeAnnotateButton(TYPES.point);
                expect(buttonEl.title).to.equal('Point Annotation Mode');
                expect(annotator.getAnnotationModeClickHandler).to.be.called;
            });
        });

        describe('getAnnotationModeClickHandler()', () => {
            beforeEach(() => {
                stubs.isModeAnnotatable = sandbox.stub(annotator, 'isModeAnnotatable').returns(false);
            });

            it('should return null if you cannot annotate', () => {
                const handler = annotator.getAnnotationModeClickHandler(TYPES.point);
                expect(stubs.isModeAnnotatable).to.be.called;
                expect(handler).to.equal(null);
            });

            it('should return the toggle point mode handler', () => {
                stubs.isModeAnnotatable.returns(true);
                stubs.toggle = sandbox.stub(annotator, 'toggleAnnotationHandler');

                const handler = annotator.getAnnotationModeClickHandler(TYPES.point);
                expect(stubs.isModeAnnotatable).to.be.called;
                expect(handler).to.be.a('function');

                handler(event);
                expect(stubs.toggle).to.have.been.calledWith(TYPES.point);
            });
        });
    });
});
