/* eslint-disable no-unused-expressions */
import EventEmitter from 'events';
import Annotator from '../Annotator';
import * as annotatorUtil from '../annotatorUtil';
import AnnotationService from '../AnnotationService';
import {
    STATES,
    TYPES,
    CLASS_ANNOTATION_DRAW_MODE,
    CLASS_ANNOTATION_MODE,
    CLASS_ACTIVE,
    CLASS_HIDDEN,
    SELECTOR_ANNOTATION_BUTTON_DRAW_POST,
    SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO,
    SELECTOR_ANNOTATION_BUTTON_DRAW_REDO,
    SELECTOR_ANNOTATION_DRAWING_HEADER,
    SELECTOR_BOX_PREVIEW_BASE_HEADER,
    ANNOTATOR_EVENT,
    THREAD_EVENT
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

        const options = {
            annotator: {
                NAME: 'name'
            }
        };
        annotator = new Annotator({
            canAnnotate: true,
            container: document,
            annotationService: {},
            file: {
                file_version: { id: 1 }
            },
            isMobile: false,
            options,
            modeButtons: {},
            location: {},
            localizedStrings: {
                anonymousUserName: 'anonymous',
                loadError: 'load error',
                createError: 'create error',
                deleteError: 'delete error',
                authError: 'auth error',
            }
        });
        annotator.threads = {};
        annotator.modeControllers = {};

        stubs.thread = {
            threadID: '123abc',
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeListener: () => {},
            scrollIntoView: () => {},
            getThreadEventData: () => {},
            type: 'type'
        };
        stubs.threadMock = sandbox.mock(stubs.thread);

        stubs.thread2 = {
            threadID: '456def',
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock2 = sandbox.mock(stubs.thread2);

        stubs.thread3 = {
            threadID: '789ghi',
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
        annotator.modeButtons = {};
        annotator.modeControllers = {};

        if (typeof annotator.destroy === 'function') {
            annotator.destroy();
            annotator = null;
        }

        stubs = {};
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
            stubs.getPermissions = sandbox.stub(annotator, 'getAnnotationPermissions');

            annotator.permissions = { canAnnotate: true };
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
            expect(stubs.getPermissions).to.be.called;
        });

        it('should setup mobile dialog for mobile browsers', () => {
            annotator.isMobile = true;
            annotator.init();
            expect(stubs.setupMobileDialog).to.be.called;
            expect(stubs.getPermissions).to.be.called;
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

            expect(annotator.threads).to.not.be.undefined;
            expect(annotator.bindDOMListeners).to.be.called;
            expect(annotator.bindCustomListenersOnService).to.be.called;
            expect(annotator.addListener).to.be.calledWith(ANNOTATOR_EVENT.scale, sinon.match.func);
        });
    });

    describe('once annotator is initialized', () => {
        beforeEach(() => {
            const annotatedEl = document.querySelector('.annotated-element');
            annotator.annotatedElement = annotatedEl;
            sandbox.stub(annotator, 'getAnnotatedEl').returns(annotatedEl);
            sandbox.stub(annotator, 'setupAnnotations');
            sandbox.stub(annotator, 'showAnnotations');

            stubs.thread.location = { page: 1 };
            stubs.thread2.location = { page: 2 };
            stubs.thread3.location = { page: 2 };
            annotator.addThreadToMap(stubs.thread);
            annotator.addThreadToMap(stubs.thread2);
            annotator.addThreadToMap(stubs.thread3);

            annotator.init();
        });

        afterEach(() => {
            annotator.threads = {};
        });

        describe('destroy()', () => {
            it('should unbind custom listeners on thread and unbind DOM listeners', () => {
                stubs.thread.location = { page: 1 };
                annotator.addThreadToMap(stubs.thread);

                const unbindCustomStub = sandbox.stub(annotator, 'unbindCustomListenersOnThread');
                const unbindDOMStub = sandbox.stub(annotator, 'unbindDOMListeners');
                const unbindCustomListenersOnService = sandbox.stub(annotator, 'unbindCustomListenersOnService');
                const unbindListener = sandbox.stub(annotator, 'removeListener');

                annotator.destroy();

                expect(unbindCustomStub).to.be.calledWith(stubs.thread);
                expect(unbindDOMStub).to.be.called;
                expect(unbindCustomListenersOnService).to.be.called;
                expect(unbindListener).to.be.calledWith(ANNOTATOR_EVENT.scale, sinon.match.func);
            });
        });

        describe('hideAnnotations()', () => {
            it('should call hide on each thread in map', () => {
                sandbox.stub(annotator, 'hideAnnotationsOnPage');
                annotator.hideAnnotations();
                expect(annotator.hideAnnotationsOnPage).to.be.calledTwice;
            });
        });

        describe('hideAnnotationsOnPage()', () => {
            it('should call hide on each thread in map on page 1', () => {
                stubs.threadMock.expects('hide');
                stubs.threadMock2.expects('hide').never();
                stubs.threadMock3.expects('hide').never();
                annotator.hideAnnotationsOnPage(1);
            });
        });

        describe('renderAnnotations()', () => {
            it('should call show on each thread', () => {
                sandbox.stub(annotator, 'renderAnnotationsOnPage');
                annotator.renderAnnotations();
                expect(annotator.renderAnnotationsOnPage).to.be.calledTwice;
            });
        });

        describe('renderAnnotationsOnPage()', () => {
            it('should call show on each thread', () => {
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                stubs.threadMock.expects('show');
                stubs.threadMock2.expects('show').never();
                stubs.threadMock3.expects('show').never();
                annotator.renderAnnotationsOnPage(1);
            });

            it('should not call show() if the thread type is disabled', () => {
                const badType = 'not_accepted';
                stubs.thread3.type = badType;
                stubs.thread2.type = 'type';

                stubs.threadMock3.expects('show').never();
                stubs.threadMock2.expects('show').once();

                const isModeAnn = sandbox.stub(annotator, 'isModeAnnotatable');
                isModeAnn.withArgs(badType).returns(false);
                isModeAnn.withArgs('type').returns(true);

                annotator.renderAnnotationsOnPage('2');
            });
        });

        describe('rotateAnnotations()', () => {
            beforeEach(() => {
                annotator.permissions.canAnnotate = true;
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
                annotator.permissions.canAnnotate = false;
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

        describe('exitAnnotationModesExcept()', () => {
            it('should call disableAnnotationMode on all modes except the specified one', () => {
                annotator.modeButtons = {
                    'type1': {
                        selector: 'bogus',
                        button: 'button1'
                    },
                    'type2': {
                        selector: 'test',
                        button: 'button2'
                    }
                };

                sandbox.stub(annotator, 'disableAnnotationMode');
                annotator.exitAnnotationModesExcept('type2');
                expect(annotator.disableAnnotationMode).to.be.calledWith('type1', 'button1');
                expect(annotator.disableAnnotationMode).to.not.be.calledWith('type2', 'button2');
            });
        });

        describe('toggleAnnotationHandler()', () => {
            beforeEach(() => {
                stubs.destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
                stubs.annotationMode = sandbox.stub(annotator, 'isInAnnotationMode');
                stubs.exitModes = sandbox.stub(annotator, 'exitAnnotationModesExcept');
                stubs.disable = sandbox.stub(annotator, 'disableAnnotationMode');
                stubs.enable = sandbox.stub(annotator, 'enableAnnotationMode');
                sandbox.stub(annotator, 'getAnnotateButton');
                stubs.isAnnotatable = sandbox.stub(annotator, 'isModeAnnotatable').returns(true);

                annotator.modeButtons = {
                    point: { selector: 'point_btn' },
                    draw: { selector: 'draw_btn' }
                };

                annotator.createHighlightDialog = {
                    isVisible: false,
                    hide: sandbox.stub()
                }
            });

            afterEach(() => {
                annotator.modeButtons = {};
            });

            it('should do nothing if specified annotation type is not annotatable', () => {
                stubs.isAnnotatable.returns(false);
                annotator.toggleAnnotationHandler('bleh');
                expect(stubs.destroyStub).to.not.be.called;
            });

            it('should do nothing if specified annotation type does not have a mode button', () => {
                annotator.toggleAnnotationHandler(TYPES.highlight);
                expect(stubs.destroyStub).to.be.called;
                expect(stubs.exitModes).to.not.be.called;
            });

            it('should hide the highlight dialog and remove selection if it is visible', () => {
                const getSelectionStub = sandbox.stub(document, 'getSelection').returns({
                    removeAllRanges: sandbox.stub()
                });

                annotator.toggleAnnotationHandler(TYPES.highlight);
                expect(annotator.createHighlightDialog.hide).to.not.be.called;
                expect(getSelectionStub).to.not.be.called;

                annotator.createHighlightDialog.isVisible = true;

                annotator.toggleAnnotationHandler(TYPES.highlight);
                expect(annotator.createHighlightDialog.hide).to.be.called;
                expect(getSelectionStub).to.be.called;
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

        describe('disableAnnotationMode()', () => {
            beforeEach(() => {
                annotator.currentAnnotationMode = TYPES.point;
                stubs.isModeAnnotatable = sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                stubs.isInMode = sandbox.stub(annotator, 'isInAnnotationMode').returns(false);
                stubs.emit = sandbox.stub(annotator, 'emit');
                stubs.unbindMode = sandbox.stub(annotator, 'unbindModeListeners');
                stubs.bindDOM = sandbox.stub(annotator, 'bindDOMListeners');
            });

            it('should do nothing when the mode is not annotatable', () => {
                stubs.isModeAnnotatable.returns(false);
                annotator.annotatedElement = null;

                expect(annotator.disableAnnotationMode, TYPES.draw).to.not.throw();
            });

            it('should exit annotation mode if currently in the specified mode', () => {
                stubs.isInMode.returns(true);
                annotator.disableAnnotationMode(TYPES.point);
                expect(stubs.emit).to.be.calledWith(ANNOTATOR_EVENT.modeExit, sinon.match.object);
                expect(stubs.unbindMode).to.be.calledWith(TYPES.point);
                expect(stubs.bindDOM).to.be.called;
                expect(annotator.annotatedElement).to.not.have.class(CLASS_ANNOTATION_MODE);
                expect(annotator.currentAnnotationMode).to.be.null;
            });

            it('should deactivate point annotation mode button', () => {
                const btn = document.querySelector('.bp-btn-annotate');
                annotator.disableAnnotationMode(TYPES.point, btn);
                expect(btn).to.not.have.class(CLASS_ACTIVE);
            });

            it('should deactivate draw annotation mode button', () => {
                const btn = document.querySelector('.bp-btn-annotate');
                annotator.disableAnnotationMode(TYPES.draw, btn);
                expect(btn).to.not.have.class(CLASS_ACTIVE);
            });
        });

        describe('enableAnnotationMode()', () => {
            beforeEach(() => {
                stubs.emit = sandbox.stub(annotator, 'emit');
                stubs.unbindDOM = sandbox.stub(annotator, 'unbindDOMListeners');
                stubs.bindMode = sandbox.stub(annotator, 'bindModeListeners');
            });

            it('should enter annotation mode', () => {
                annotator.enableAnnotationMode(TYPES.point);
                expect(stubs.emit).to.be.calledWith(ANNOTATOR_EVENT.modeEnter, sinon.match.object);
                expect(stubs.unbindDOM).to.be.called;
                expect(stubs.bindMode).to.be.calledWith(TYPES.point);
                expect(annotator.annotatedElement).to.have.class(CLASS_ANNOTATION_MODE);
            });

            it('should deactivate point annotation mode button', () => {
                const btn = document.querySelector('.bp-btn-annotate');
                annotator.enableAnnotationMode(TYPES.point, btn);
                expect(btn).to.have.class(CLASS_ACTIVE);
            });

            it('should deactivate draw annotation mode button', () => {
                const btn = document.querySelector('.bp-btn-annotate');
                annotator.enableAnnotationMode(TYPES.draw, btn);
                expect(btn).to.have.class(CLASS_ACTIVE);
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
                sandbox.stub(annotator, 'emit');
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);

                annotator.permissions = {
                    canViewAllAnnotations: true,
                    canViewOwnAnnotations: true
                };
            });

            it('should not fetch existing annotations if the user does not have correct permissions', () => {
                stubs.serviceMock.expects('getThreadMap').never();
                annotator.permissions = {
                    canViewAllAnnotations: false,
                    canViewOwnAnnotations: false
                };
                const result = annotator.fetchAnnotations();
                expect(result instanceof Promise).to.be.truthy;
            });

            it('should fetch existing annotations if the user can view all annotations', () => {
                stubs.serviceMock.expects('getThreadMap').returns(Promise.resolve());
                annotator.permissions = {
                    canViewAllAnnotations: false,
                    canViewOwnAnnotations: true
                };
                const result = annotator.fetchAnnotations();
                expect(result instanceof Promise).to.be.truthy;
            });

            it('should fetch existing annotations if the user can view all annotations', () => {
                stubs.serviceMock.expects('getThreadMap').returns(Promise.resolve());
                annotator.permissions = {
                    canViewAllAnnotations: true,
                    canViewOwnAnnotations: false
                };
                const result = annotator.fetchAnnotations();
                expect(result instanceof Promise).to.be.truthy;
            });

            it('should reset and create a new thread map by fetching annotation data from the server', () => {
                stubs.serviceMock.expects('getThreadMap').returns(stubs.threadPromise);
                stubs.createThread = sandbox.stub(annotator, 'createAnnotationThread');
                stubs.createThread.onFirstCall();
                stubs.createThread.onSecondCall().returns(stubs.thread);
                sandbox.stub(annotator, 'bindCustomListenersOnThread');

                const result = annotator.fetchAnnotations();
                return stubs.threadPromise.then(() => {
                    expect(annotator.threads).to.not.be.undefined;
                    expect(annotator.createAnnotationThread).to.be.calledTwice;
                    expect(annotator.bindCustomListenersOnThread).to.be.calledTwice;
                    expect(result).to.be.an.object;
                });
            });

            it('should emit a message to indicate that all annotations have been fetched', () => {
                stubs.serviceMock.expects('getThreadMap').returns(stubs.threadPromise);
                annotator.fetchAnnotations();
                return stubs.threadPromise.then(() => {
                    expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.fetch);
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
                expect(addListenerStub).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.func);
            });
        });

        describe('handleServiceEvents()', () => {
            beforeEach(() => {
                sandbox.stub(annotator, 'emit');
            });

            it('should emit annotatorerror on read error event', () => {
                annotator.handleServiceEvents({ reason: 'read' });
                expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
            });

            it('should emit annotatorerror and show annotations on create error event', () => {
                annotator.handleServiceEvents({ reason: 'create' });
                expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
                expect(annotator.showAnnotations).to.be.called;
            });

            it('should emit annotatorerror and show annotations on delete error event', () => {
                annotator.handleServiceEvents({ reason: 'delete' });
                expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
                expect(annotator.showAnnotations).to.be.called;
            });

            it('should emit annotatorerror on authorization error event', () => {
                annotator.handleServiceEvents({ reason: 'authorization' });
                expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
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
                const removeListenerStub = sandbox.stub(annotator.annotationService, 'removeListener');

                annotator.unbindCustomListenersOnService();
                expect(removeListenerStub).to.be.called;
            });
        });

        describe('bindCustomListenersOnThread()', () => {
            it('should bind custom listeners on the thread', () => {
                stubs.threadMock.expects('addListener').withArgs('threadevent', sinon.match.func);
                annotator.bindCustomListenersOnThread(stubs.thread);
            });

            it('should do nothing when given thread is empty', () => {
                stubs.threadMock.expects('addListener').never();
                annotator.bindCustomListenersOnThread(null);
            })
        });

        describe('unbindCustomListenersOnThread()', () => {
            it('should unbind custom listeners from the thread', () => {
                stubs.threadMock.expects('removeListener').withArgs('threadevent');
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

                stubs.controllers = {
                    [TYPES.draw]: {
                        bindModeListeners: sandbox.stub()
                    }
                };

                annotator.modeControllers = stubs.controllers;
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

            it('should bind draw mode click handlers if post button exists', () => {
                annotator.bindModeListeners(TYPES.draw);

                expect(annotator.annotatedElement.addEventListener).to.not.be.called;
                expect(stubs.controllers[TYPES.draw].bindModeListeners).to.be.called;
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

            it('should delegate to the controller', () => {
                annotator.modeControllers = {
                    [TYPES.draw]: {
                        name: 'drawingModeController',
                        unbindModeListeners: sandbox.stub()
                    }
                };

                annotator.unbindModeListeners(TYPES.draw);
                expect(annotator.modeControllers[TYPES.draw].unbindModeListeners).to.be.called;
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
                stubs.emit = sandbox.stub(annotator, 'emit');
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
                stubs.threadMock.expects('getThreadEventData').returns('data');

                stubs.threadMock.expects('show');
                annotator.pointClickHandler(event);

                expect(annotator.getLocationFromEvent).to.be.called;
                expect(annotator.bindCustomListenersOnThread).to.be.called;
                expect(annotator.disableAnnotationMode).to.be.called;
                expect(annotator.emit).to.be.calledWith(THREAD_EVENT.pending, 'data');
            });
        });

        describe('addThreadToMap()', () => {
            it('should add valid threads to the thread map', () => {
                stubs.thread.location = { page: 1 };
                stubs.thread2.location = { page: 1 };

                const threadMap = { '456def': stubs.thread2 };
                annotator.threads = { 1: threadMap };
                annotator.addThreadToMap(stubs.thread);

                const pageThreads = annotator.getThreadsOnPage(1);
                expect(pageThreads).to.have.any.keys(stubs.thread.threadID);
            });
        });

        describe('removeThreadFromMap()', () => {
            it('should remove a valid thread from the thread map', () => {
                stubs.thread.location = { page: 1 };
                stubs.thread2.location = { page: 1 };
                annotator.addThreadToMap(stubs.thread);
                annotator.addThreadToMap(stubs.thread2);

                annotator.removeThreadFromMap(stubs.thread);
                const pageThreads = annotator.getThreadsOnPage(1);
                expect(pageThreads).to.not.have.any.keys(stubs.thread.threadID);
                expect(pageThreads).to.have.any.keys(stubs.thread2.threadID);
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

        describe('scrollToAnnotation()', () => {
            beforeEach(() => {
                stubs.thread.location = { page: 1 };
                annotator.addThreadToMap(stubs.thread);
            });

            it('should do nothing if no threadID is provided', () => {
                stubs.threadMock.expects('scrollIntoView').never();
                annotator.scrollToAnnotation();
            });

            it('should do nothing if threadID does not exist on page', () => {
                stubs.threadMock.expects('scrollIntoView').never();
                annotator.scrollToAnnotation('wrong');
            });

            it('should scroll to annotation if threadID exists on page', () => {
                stubs.threadMock.expects('scrollIntoView');
                annotator.scrollToAnnotation(stubs.thread.threadID);
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

        describe('getThreadsOnPage()', () => {
            it('should add page to threadMap if it does not already exist', () => {
                annotator.threads = {
                    1: 'not empty'
                };
                const threads = annotator.getThreadsOnPage(2);
                expect(threads).to.not.be.undefined;
                annotator.threads = {};
            });

            it('should return an existing page in the threadMap', () => {
                annotator.threads = {
                    1: 'not empty'
                };
                const threads = annotator.getThreadsOnPage(1);
                expect(threads).equals('not empty');
                annotator.threads = {};
            });
        });

        describe('getThreadByID()', () => {
            it('should find and return annotation thread specified by threadID', () => {
                annotator.threads = { 1: {} };
                sandbox.stub(annotator, 'getThreadsOnPage').returns({
                    '123abc': stubs.thread
                });
                const thread = annotator.getThreadByID(stubs.thread.threadID);
                expect(thread).to.deep.equals(stubs.thread);
            });

            it('should return null if specified annotation thread is invalid', () => {
                annotator.threads = { 1: {} };
                sandbox.stub(annotator, 'getThreadsOnPage').returns({
                    '123abc': stubs.thread
                });
                const thread = annotator.getThreadByID('random');
                expect(thread).to.deep.equals(null);
            });
        });

        describe('destroyPendingThreads()', () => {
            beforeEach(() => {
                stubs.thread = {
                    threadID: '123abc',
                    location: { page: 2 },
                    type: 'type',
                    state: STATES.pending,
                    destroy: () => {},
                    unbindCustomListenersOnThread: () => {},
                    removeAllListeners: () => {}
                };
                stubs.threadMock = sandbox.mock(stubs.thread);
                stubs.isPending = sandbox.stub(annotatorUtil, 'isPending').returns(false);
                stubs.isPending.withArgs(STATES.pending).returns(true);

                annotator.addThreadToMap(stubs.thread);
                annotator.init();
            });

            it('should destroy and return true if there are any pending threads', () => {
                stubs.threadMock.expects('destroy');
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(true);
            });

            it('should not destroy and return false if there are no threads', () => {
                annotator.threads = {};
                stubs.threadMock.expects('destroy').never();
                stubs.isPending.returns(false);
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(false);
            });

            it('should not destroy and return false if the threads are not pending', () => {
                stubs.thread.state = 'NOT_PENDING';
                stubs.threadMock.expects('destroy').never();
                const destroyed = annotator.destroyPendingThreads();
                expect(destroyed).to.equal(false);
            });

            it('should destroy only pending threads, and return true', () => {
                stubs.thread.state = 'NOT_PENDING';
                const pendingThread = {
                    threadID: '456def',
                    location: { page: 1 },
                    type: 'type',
                    state: STATES.pending,
                    destroy: () => {},
                    unbindCustomListenersOnThread: () => {},
                    removeAllListeners: () => {}
                };
                stubs.pendingMock = sandbox.mock(pendingThread);
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
                expect(annotator.emit).to.not.be.calledWith(ANNOTATOR_EVENT.error);
                expect(annotator.validationErrorEmitted).to.be.true;
            });

            it('should emit annotatorerror on first error', () => {
                sandbox.stub(annotator, 'emit');
                annotator.validationErrorEmitted = false;
                annotator.handleValidationError();
                expect(annotator.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
                expect(annotator.validationErrorEmitted).to.be.true;
            });
        });

        describe('handleAnnotationThreadEvents()', () => {
            beforeEach(() => {
                stubs.getThread = sandbox.stub(annotator, 'getThreadByID');
                stubs.emit = sandbox.stub(annotator, 'emit');
                stubs.unbind = sandbox.stub(annotator, 'unbindCustomListenersOnThread');
                stubs.remove = sandbox.stub(annotator, 'removeThreadFromMap');
            });

            it('should do nothing if invalid params are specified', () => {
                annotator.handleAnnotationThreadEvents('no data');
                annotator.handleAnnotationThreadEvents({ data: 'no threadID'});
                expect(stubs.getThread).to.not.be.called;

                annotator.handleAnnotationThreadEvents({ data: { threadID: 1 }});
                expect(stubs.emit).to.not.be.called;
                expect(stubs.unbind).to.not.be.called;
                expect(stubs.remove).to.not.be.called;
            });

            it('should unbind custom thread listeners on threadCleanup', () => {
                stubs.getThread.returns(stubs.thread);
                annotator.handleAnnotationThreadEvents({
                    event: THREAD_EVENT.threadCleanup,
                    data: { threadID: 1 }
                });
                expect(stubs.unbind).to.be.called;
                expect(stubs.emit).to.not.be.called;
                expect(stubs.remove).to.not.be.called;
            });

            it('should remove thread from map on threadDelete', () => {
                stubs.getThread.returns(stubs.thread);
                const data = {
                    event: THREAD_EVENT.threadDelete,
                    data: { threadID: 1 }
                };
                annotator.handleAnnotationThreadEvents(data);
                expect(stubs.emit).to.be.calledWith(data.event, data.data);
                expect(stubs.remove).to.be.called;
                expect(stubs.unbind).to.not.be.called;
            });

            it('should emit delete error notification event', () => {
                stubs.getThread.returns(stubs.thread);
                const data = {
                    event: THREAD_EVENT.deleteError,
                    data: { threadID: 1 }
                };
                annotator.handleAnnotationThreadEvents(data);
                expect(stubs.emit).to.be.calledWith(data.event, data.data);
                expect(stubs.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
                expect(stubs.unbind).to.not.be.called;
                expect(stubs.remove).to.not.be.called;
            });

            it('should emit save error notification event', () => {
                stubs.getThread.returns(stubs.thread);
                const data = {
                    event: THREAD_EVENT.createError,
                    data: { threadID: 1 }
                };
                annotator.handleAnnotationThreadEvents(data);
                expect(stubs.emit).to.be.calledWith(data.event, data.data);
                expect(stubs.emit).to.be.calledWith(ANNOTATOR_EVENT.error, sinon.match.string);
                expect(stubs.unbind).to.not.be.called;
                expect(stubs.remove).to.not.be.called;
            });

            it('should emit thread event', () => {
                stubs.getThread.returns(stubs.thread);
                const data = {
                    event: THREAD_EVENT.pending,
                    data: { threadID: 1 }
                };
                annotator.handleAnnotationThreadEvents(data);
                expect(stubs.emit).to.be.calledWith(data.event, data.data);
                expect(stubs.unbind).to.not.be.called;
                expect(stubs.remove).to.not.be.called;
            });
        });

        describe('emit()', () => {
            const emitFunc = EventEmitter.prototype.emit;

            afterEach(() => {
                Object.defineProperty(EventEmitter.prototype, 'emit', { value: emitFunc });
            });

            it('should pass through the event as well as broadcast it as a annotator event', () => {
                const fileId = '1';
                const fileVersionId = '1';
                const event = 'someEvent';
                const data = {};
                const annotatorName = 'name';

                annotator = new Annotator({
                    canAnnotate: true,
                    container: document,
                    annotationService: {},
                    isMobile: false,
                    annotator: { NAME: annotatorName },
                    file: {
                        id: fileId,
                        file_version: {
                            id: fileVersionId
                        }
                    },
                    location: { locale: 'en-US' },
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
                    fileId,
                    fileVersionId
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
                annotator.permissions.canAnnotate = true;
            });

            afterEach(() => {
                annotator.modeButtons = {};
                annotator.container = document;
            });

            it('should do nothing if user cannot annotate', () => {
                annotator.permissions.canAnnotate = false;
                sandbox.stub(annotator, 'isModeAnnotatable').returns(true);
                sandbox.stub(annotator, 'getAnnotationModeClickHandler');
                annotator.showModeAnnotateButton(TYPES.point);
                expect(annotator.getAnnotationModeClickHandler).to.not.be.called;
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

        describe('getAnnotateButton()', () => {
            it('should return the annotate button', () => {
                const selector = 'bp-btn-annotate';
                const buttonEl = annotator.getAnnotateButton(`.${selector}`);
                expect(buttonEl).to.have.class(selector);
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
                expect(stubs.toggle).to.be.calledWith(TYPES.point);
            });
        });
    });
});
