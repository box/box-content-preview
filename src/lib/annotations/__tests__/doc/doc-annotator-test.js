/* eslint-disable no-unused-expressions */
import Annotator from '../../annotator';
import DocAnnotator from '../../doc/doc-annotator';
import DocHighlightThread from '../../doc/doc-highlight-thread';
import DocPointThread from '../../doc/doc-point-thread';
import rangy from 'rangy';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';
import * as constants from '../../annotation-constants';


let annotator;
let stubs;
const sandbox = sinon.sandbox.create();

describe('doc-annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/doc/doc-annotator-test.html');

        annotator = new DocAnnotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = {};
    });

    describe('getLocationFromEvent()', () => {
        describe('point', () => {
            it('should not return a location if there is a selection present', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                const location = annotator.getLocationFromEvent({}, 'point');
                expect(location).to.be.null;
            });

            it('should not return a location if click isn\'t on page', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: null,
                    page: -1
                });

                const location = annotator.getLocationFromEvent({}, 'point');
                expect(location).to.be.null;
            });

            it('should not return a location if click is on dialog', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: document.querySelector('.annotated-element'),
                    page: 1
                });
                sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-dialog');

                const location = annotator.getLocationFromEvent({}, 'point');
                expect(location).to.be.null;
            });

            it('should return a valid point location if click is valid', () => {
                const x = 100;
                const y = 200;
                const page = 2;
                const dimensions = {
                    x: 100,
                    y: 200
                };

                sandbox.stub(annotatorUtil, 'getScale').returns(1);
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: x,
                            height: y + 30 // 15px padding top and bottom
                        })
                    },
                    page
                });
                sandbox.stub(annotatorUtil, 'findClosestDataType').returns('not-a-dialog');
                sandbox.stub(docAnnotatorUtil, 'convertDOMSpaceToPDFSpace').returns([x, y]);

                const location = annotator.getLocationFromEvent({}, 'point');
                expect(location).to.deep.equal({
                    x,
                    y,
                    page,
                    dimensions
                });
            });
        });

        describe('highlight', () => {
            it('should not return a location if there is no selection present', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
                const location = annotator.getLocationFromEvent({}, 'highlight');
                expect(location).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                const getPageStub = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber');
                getPageStub.onFirstCall().returns({
                    pageEl: null,
                    page: -1
                });
                getPageStub.onSecondCall().returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: 100,
                            height: 100
                        })
                    },
                    page: 2
                });
                sandbox.stub(window, 'getSelection').returns({});
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: []
                });
                sandbox.stub(annotator, '_removeRangyHighlight');
                sandbox.stub(rangy, 'restoreSelection');

                annotator.getLocationFromEvent({}, 'highlight');
                expect(window.getSelection).to.have.been.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                const page = 3;
                const dimensions = {
                    x: 100,
                    y: 200
                };

                sandbox.stub(annotatorUtil, 'getScale').returns(1);
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: dimensions.x,
                            height: dimensions.y + 30 // 15px padidng top and bottom
                        })
                    },
                    page
                });
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: []
                });

                const location = annotator.getLocationFromEvent({}, 'highlight');
                expect(location).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                const page = 3;
                const quadPoints = [
                    [1, 2, 3, 4, 5, 6, 7, 8],
                    [2, 3, 4, 5, 6, 7, 8, 9]
                ];
                const dimensions = {
                    x: 100,
                    y: 200
                };

                sandbox.stub(annotatorUtil, 'getScale').returns(1);
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: dimensions.x,
                            height: dimensions.y + 30 // 15px padidng top and bottom
                        })
                    },
                    page
                });
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: [{}, {}]
                });
                const quadPointStub = sandbox.stub(docAnnotatorUtil, 'getQuadPoints');
                quadPointStub.onFirstCall().returns(quadPoints[0]);
                quadPointStub.onSecondCall().returns(quadPoints[1]);
                sandbox.stub(annotator, '_removeRangyHighlight');
                sandbox.stub(rangy, 'restoreSelection');

                const location = annotator.getLocationFromEvent({}, 'highlight');
                expect(location).to.deep.equal({
                    page,
                    quadPoints,
                    dimensions
                });
            });
        });

        describe('highlight-comment', () => {
            it('should not return a location if there is no selection present', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
                const location = annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(location).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                const getPageStub = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber');
                getPageStub.onFirstCall().returns({
                    pageEl: null,
                    page: -1
                });
                getPageStub.onSecondCall().returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: 100,
                            height: 100
                        })
                    },
                    page: 2
                });
                sandbox.stub(window, 'getSelection').returns({});
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: []
                });
                sandbox.stub(annotator, '_removeRangyHighlight');
                sandbox.stub(rangy, 'restoreSelection');

                annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(window.getSelection).to.have.been.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                const page = 3;
                const dimensions = {
                    x: 100,
                    y: 200
                };

                sandbox.stub(annotatorUtil, 'getScale').returns(1);
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: dimensions.x,
                            height: dimensions.y + 30 // 15px padidng top and bottom
                        })
                    },
                    page
                });
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: []
                });

                const location = annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(location).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                const page = 3;
                const quadPoints = [
                    [1, 2, 3, 4, 5, 6, 7, 8],
                    [2, 3, 4, 5, 6, 7, 8, 9]
                ];
                const dimensions = {
                    x: 100,
                    y: 200
                };

                sandbox.stub(annotatorUtil, 'getScale').returns(1);
                sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
                sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: dimensions.x,
                            height: dimensions.y + 30 // 15px padidng top and bottom
                        })
                    },
                    page
                });
                sandbox.stub(rangy, 'saveSelection');
                sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                    highlight: {},
                    highlightEls: [{}, {}]
                });
                const quadPointStub = sandbox.stub(docAnnotatorUtil, 'getQuadPoints');
                quadPointStub.onFirstCall().returns(quadPoints[0]);
                quadPointStub.onSecondCall().returns(quadPoints[1]);
                sandbox.stub(annotator, '_removeRangyHighlight');
                sandbox.stub(rangy, 'restoreSelection');

                const location = annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(location).to.deep.equal({
                    page,
                    quadPoints,
                    dimensions
                });
            });
        });
    });

    describe('createAnnotationThread()', () => {
        it('should create, add highlight thread to internal map, and return it', () => {
            sandbox.stub(annotator, 'addThreadToMap');
            const thread = annotator.createAnnotationThread([], {}, 'highlight');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
        });

        it('should create, add point thread to internal map, and return it', () => {
            sandbox.stub(annotator, 'addThreadToMap');
            const thread = annotator.createAnnotationThread([], {}, 'point');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof DocPointThread).to.be.true;
        });
    });

    describe('setupAnnotations()', () => {
        it('should call parent to setup annotations and initialize highlighter', () => {
            Object.defineProperty(Object.getPrototypeOf(DocAnnotator.prototype), 'setupAnnotations', {
                value: sandbox.stub()
            });

            const highlighterStub = {
                addClassApplier: sandbox.stub()
            };
            sandbox.stub(rangy, 'createHighlighter').returns(highlighterStub);

            annotator.setupAnnotations();

            expect(Annotator.prototype.setupAnnotations, 'setupAnnotations').to.have.been.called;
            expect(rangy.createHighlighter).to.have.been.called;
            expect(highlighterStub.addClassApplier).to.have.been.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('shouldn\'t bind DOM listeners if user cannot annotate except mouseup', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'addEventListener');
            annotator._annotationService.canAnnotate = false;

            annotator.bindDOMListeners();

            // mouse up gets bound regardless of annotation permissions
            expect(element.addEventListener).to.have.been.calledWith('mouseup', sinon.match.func);

            expect(element.addEventListener).to.not.have.been.calledWith('dblclick', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('mousemove', sinon.match.func);
        });

        it('should bind DOM listeners if user can annotate', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'addEventListener');
            annotator._annotationService.canAnnotate = true;

            annotator.bindDOMListeners();

            expect(element.addEventListener).to.have.been.calledWith('dblclick', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('mousemove', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('mouseup', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('shouldn\'t unbind DOM listeners if user cannot annotate except mouseup', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'removeEventListener');
            annotator._annotationService.canAnnotate = false;

            annotator.unbindDOMListeners();

            expect(element.removeEventListener).to.have.been.calledWith('mouseup', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('mousemove', sinon.match.func);
        });

        it('should unbind DOM listeners if user can annotate', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'removeEventListener');
            annotator._annotationService.canAnnotate = true;

            annotator.unbindDOMListeners();

            expect(element.removeEventListener).to.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.removeEventListener).to.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.removeEventListener).to.have.been.calledWith('mousemove', sinon.match.func);
            expect(element.removeEventListener).to.have.been.calledWith('mouseup', sinon.match.func);
        });
    });

    describe('bindCustomListenersOnThread()', () => {
        it('should call parent to bind custom listeners and also bind on threaddeleted', () => {
            const thread = {
                addListener: sandbox.stub()
            };

            Object.defineProperty(Object.getPrototypeOf(DocAnnotator.prototype), 'bindCustomListenersOnThread', {
                value: sandbox.stub()
            });

            annotator.bindCustomListenersOnThread(thread);

            expect(Annotator.prototype.bindCustomListenersOnThread).to.have.been.calledWith(thread);
            expect(thread.addListener).to.have.been.calledWith('threaddeleted', sinon.match.func);
        });
    });

    describe('_highlightMousedownHandler()', () => {
        it('should get highlights on page and call their onMouse down method', () => {
            const threadPages = { thread1: 'thread', thread: 'thread' };
            const thread1 = { onMousedown: sinon.stub() };
            const thread2 = { onMousedown: sinon.stub() };
            const highlightStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([thread1, thread2]);

            annotator._threads = threadPages;
            annotator._highlightMousedownHandler({ clientX: 1, clientY: 1 });
            expect(highlightStub).to.be.calledTwice;
            expect(thread1.onMousedown).to.be.called;
            expect(thread2.onMousedown).to.be.called;
        });
    });

    describe('_highlightMousemoveHandler()', () => {
        it('should do nothing if the throttledHighlightMousemoveHandler already exists', () => {
            annotator._throttledHighlightMousemoveHandler = true;
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            const result = annotator._highlightMousemoveHandler();

            expect(getHighlightsStub).to.not.be.called;
            expect(result).to.be.true;
        });

        it('should do nothing if there are pending, pending-active, active, or active hover highlight threads', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns(['thread1', 'thread2']);
            const result = annotator._highlightMousemoveHandler()({ x: 1, y: 2 });

            expect(getHighlightsStub).to.be.called;
            expect(result).to.equal(undefined);
        });

        it('should set _didMouseMove to true if the mouse was moved enough', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator._highlightMousemoveHandler()({ clientX: 10, clientY: 10 });
            expect(getHighlightsStub).to.be.called;
            expect(annotator._didMouseMove).to.equal(true);
        });

        it('should not set _didMouseMove to true if the mouse was not moved enough', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(getHighlightsStub).to.be.called;
            expect(annotator._didMouseMove).to.equal(undefined);
        });

        it('should not add any delayThreads if the page is not found', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);
            const getPageStub = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ page: -1 });
            const getHighlightThreadStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage');

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(getPageStub).to.be.called;
            expect(getHighlightThreadStub).to.not.be.called;
            expect(getHighlightsStub).to.be.called;
        });

        it('should add delayThreads and hide innactive threads if the page is found', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const thread = {
                onMousemove: sandbox.stub(),
                show: sandbox.stub(),
                hideDialog: sandbox.stub()
            };
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            getHighlightsStub.onCall(0).returns([]);
            getHighlightsStub.onCall(1).returns([thread, thread]);

            const getPageStub = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ page: 1 });
            const getHighlightThreadStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([thread, thread]);
            thread.onMousemove.onCall(0).returns(false);
            thread.onMousemove.onCall(1).returns(true);

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(getPageStub).to.be.called;
            expect(getHighlightThreadStub).to.be.called;
            expect(thread.onMousemove).to.be.calledTwice;
            expect(getHighlightsStub).to.be.called;
            expect(thread.hideDialog).to.be.calledTwice;
        });

        it('should show the first delayed thread, and hide all others', () => {
            annotator._throttledHighlightMousemoveHandler = false;
            const thread = {
                onMousemove: sandbox.stub(),
                show: sandbox.stub(),
                hideDialog: sandbox.stub(),
                state: 'inactive'
            };
            const getHighlightsStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            getHighlightsStub.onCall(0).returns([]);
            getHighlightsStub.onCall(1).returns([thread, thread]);

            const getPageStub = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ page: 1 });
            const getHighlightThreadStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([thread, thread]);
            thread.onMousemove.onCall(0).returns(true);
            thread.onMousemove.onCall(1).returns(true);

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(getPageStub).to.be.called;
            expect(getHighlightThreadStub).to.be.called;
            expect(thread.onMousemove).to.be.calledTwice;
            expect(getHighlightsStub).to.be.called;
            expect(thread.show).to.be.calledOnce;
            expect(thread.hideDialog).to.be.calledThrice;
        });
    });

    describe('_highlightMouseupHandler()', () => {
        beforeEach(() => {
            stubs.thread = { onMousemove: () => {} };
            stubs.threadStub = sandbox.stub(stubs.thread, 'onMousemove');
            stubs.highlightsWithStatesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);
            stubs.createHandlerStub = sandbox.stub(annotator, '_highlightCreateHandler');
            stubs.windowStub = sandbox.stub(window.getSelection(), 'removeAllRanges');
            stubs.clickHandlerStub = sandbox.stub(annotator, '_highlightClickHandler');
        });
        it('should call the on mouse movement, remove all ranges, and return if there are active hover or hovering annotations', () => {
            const thread = { onMousemove: sandbox.stub() };
            stubs.highlightsWithStatesStub.returns([thread]);

            annotator._highlightMouseupHandler({ x: 0, y: 0 });
            expect(stubs.highlightsWithStatesStub).to.be.called;
            expect(thread.onMousemove).to.be.called;
            expect(stubs.windowStub).to.be.called;
            expect(stubs.createHandlerStub).to.not.be.called;
            expect(stubs.clickHandlerStub).to.not.be.called;
        });

        it('should do nothing, call highlightClickHandler if on mobile, and the mouse did not move', () => {
            annotator._highlightMouseupHandler({ x: 0, y: 0 });
            expect(stubs.highlightsWithStatesStub).to.be.called;
            expect(stubs.windowStub).to.not.be.called;
            expect(stubs.threadStub).to.not.be.called;
            expect(stubs.createHandlerStub).to.not.be.called;
            expect(stubs.clickHandlerStub).to.be.called;
        });
    });
    describe('_highlightCreateHandler()', () => {
        it('should stop event propogation', () => {
            const event = new Event({ x: 1, y: 1 });
            const eventStub = sandbox.stub(event, 'stopPropagation');
            const threadsWithStatesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);

            annotator._highlightCreateHandler(event);
            expect(eventStub).to.be.called;
            expect(threadsWithStatesStub).to.be.called;
        });

        it('should do nothing if there are no pending threads', () => {
            const event = new Event({ x: 1, y: 1 });
            const threadsWithStatesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([]);

            annotator._highlightCreateHandler(event);
            expect(threadsWithStatesStub).to.be.called;
        });

        it('should reset active highlight threads', () => {
            const event = new Event({ x: 1, y: 1 });
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            const thread = { reset: () => {} };
            const threadStub = sandbox.stub(thread, 'reset');
            statesStub.onCall(0).returns([]);
            statesStub.onCall(1).returns([thread]);

            annotator._highlightCreateHandler(event);
            expect(statesStub).to.be.called;
            expect(threadStub).to.be.called;
        });

        it('should return before showing if the location is invalid', () => {
            const event = new Event({ x: 1, y: 1 });
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            statesStub.onCall(0).returns([]);
            statesStub.onCall(1).returns([]);
            const locationStub = sandbox.stub(annotator, 'getLocationFromEvent').returns(undefined);
            const threadStub = sandbox.stub(annotator, 'createAnnotationThread');

            annotator._highlightCreateHandler(event);
            expect(statesStub).to.be.called;
            expect(locationStub).to.be.called;
            expect(threadStub).to.not.be.called;
        });

        it('should show and bind listeners to a thread', () => {
            const event = new Event({ x: 1, y: 1 });
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates');
            statesStub.onCall(0).returns([]);
            statesStub.onCall(1).returns([]);
            const locationStub = sandbox.stub(annotator, 'getLocationFromEvent').returns(true);
            const thread = { show: () => {} };
            const threadStub = sandbox.stub(annotator, 'createAnnotationThread').returns(thread);
            const threadShowStub = sandbox.stub(thread, 'show');
            const threadBindStub = sandbox.stub(annotator, 'bindCustomListenersOnThread');

            annotator._highlightCreateHandler(event);
            expect(statesStub).to.be.called;
            expect(locationStub).to.be.called;
            expect(threadStub).to.be.called;
            expect(threadShowStub).to.be.called;
            expect(threadBindStub).to.be.called;
        });
    });

    describe('_highlightClickHandler()', () => {
        beforeEach(() => {
            stubs.cancelFirstComment = sandbox.stub();
            stubs.onClick = sandbox.stub();
            stubs.show = sandbox.stub();
        });

        it('should cancel the first comment of pending threads', () => {
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([stubs]);
            annotator._threads = [];
            annotator._highlightClickHandler({ x: 1, y: 1 });

            expect(stubs.cancelFirstComment).to.be.called;
            expect(statesStub).to.be.calledWith(constants.ANNOTATION_STATE_PENDING, constants.ANNOTATION_STATE_PENDING_ACTIVE);
        });

        it('should not show a thread if it is not active', () => {
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([stubs]);
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([stubs]);
            const event = { x: 1, y: 1 };
            annotator._threads = { thread: 1 };

            annotator._highlightClickHandler(event);
            expect(statesStub).to.be.calledWith(constants.ANNOTATION_STATE_PENDING, constants.ANNOTATION_STATE_PENDING_ACTIVE);
            expect(stubs.onClick).to.be.calledWith(event, false);
            expect(threadsOnPageStub).to.be.called;
            expect(stubs.show).to.not.be.called;
        });

        it('should show an active thread on the page', () => {
            stubs.onClick.returns(true);
            const statesStub = sandbox.stub(annotator, '_getHighlightThreadsWithStates').returns([stubs]);
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([stubs]);
            const event = { x: 1, y: 1 };
            annotator._threads = { thread: 1 };

            annotator._highlightClickHandler(event);
            expect(statesStub).to.be.calledWith(constants.ANNOTATION_STATE_PENDING, constants.ANNOTATION_STATE_PENDING_ACTIVE);
            expect(stubs.onClick).to.be.calledWith(event, false);
            expect(threadsOnPageStub).to.be.called;
            expect(stubs.show).to.be.called;
        });
    });

    describe('_getHighlightThreadsOnPage()', () => {
        it('return the highlight threads on that page', () => {
            const thread = [{
                type: 'highlight'
            }];
            annotator._threads = { 0: thread };
            const docStub = sandbox.stub(docAnnotatorUtil, 'isHighlightAnnotation').returns(thread);
            const threads = annotator._getHighlightThreadsOnPage(0);

            expect(docStub).to.be.calledWith('highlight');
            expect(threads).to.deep.equal(thread);
        });
    });

    describe('_getHighlightThreadsWithStates()', () => {
        it('should return a highlight if it is the state requested', () => {
            const thread = [{
                state: 'pending',
                type: 'highlight'
            }];
            annotator._threads = { 0: thread };
            const docStub = sandbox.stub(docAnnotatorUtil, 'isHighlightAnnotation').returns(true);
            const threads = annotator._getHighlightThreadsWithStates('pending');

            expect(docStub).to.be.calledWith('highlight');
            expect(threads).to.deep.equal(thread);
        });

        it('should return a highlight if it is one of the states', () => {
            const thread = [{
                state: 'active',
                type: 'highlight'
            }];
            annotator._threads = { 0: thread };
            const docStub = sandbox.stub(docAnnotatorUtil, 'isHighlightAnnotation').returns(true);
            const threads = annotator._getHighlightThreadsWithStates('pending', 'active', 'deleted');

            expect(docStub).to.be.calledWith('highlight');
            expect(threads).to.deep.equal(thread);
        });

        it('should return an empty list if no states match', () => {
            const thread = [{
                state: 'hidden',
                type: 'highlight'
            }];
            annotator._threads = { 0: thread };
            const docStub = sandbox.stub(docAnnotatorUtil, 'isHighlightAnnotation').returns(true);
            const threads = annotator._getHighlightThreadsWithStates('pending', 'active', 'deleted');

            expect(docStub).to.not.be.called;
            expect(threads).to.deep.equal([]);
        });
    });

    describe('_showHighlightsOnPage()', () => {
        beforeEach(() => {
            stubs.getContext = sandbox.stub();
            stubs.clearRect = sandbox.stub();
        });

        afterEach(() => {
            annotator._annotatedElement = document.querySelector('.annotated-element');
        });

        it('should not call clearRect or getContext if there is already an annotationLayerEl', () => {
            annotator._annotatedElement = {
                querySelector: () => {}
            };
            const pageElStub = sandbox.stub(annotator._annotatedElement, 'querySelector').returns({ querySelector: () => {} });
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([]);

            annotator._showHighlightsOnPage(0);
            expect(pageElStub).to.be.called;
            expect(threadsOnPageStub).to.be.called;
            expect(stubs.clearRect).to.be.not.called;
            expect(stubs.getContext).to.not.be.called;
        });

        it('should not call clearRect or getContext if there is not an annotationLayerEl', () => {
            annotator._annotatedElement = {
                querySelector: () => {}
            };
            const pageElStub = sandbox.stub(annotator._annotatedElement, 'querySelector');
            pageElStub.onCall(0).returns(annotator._annotatedElement);
            pageElStub.onCall(1).returns(undefined);
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([]);

            annotator._showHighlightsOnPage(0);
            expect(pageElStub).to.be.calledTwice;
            expect(threadsOnPageStub).to.be.called;
            expect(stubs.clearRect).to.be.not.called;
            expect(stubs.getContext).to.be.not.called;
        });

        it('should call clearRect or getContext if there is an annotationLayerEl', () => {
            annotator._annotatedElement = {
                querySelector: () => {},
                getContext: () => {},
                clearRect: () => {}
            };
            const pageElStub = sandbox.stub(annotator._annotatedElement, 'querySelector');
            pageElStub.onCall(0).returns(annotator._annotatedElement);
            pageElStub.onCall(1).returns(annotator._annotatedElement);
            const getContextStub = sandbox.stub(annotator._annotatedElement, 'getContext').returns(annotator._annotatedElement);
            const clearRectStub = sandbox.stub(annotator._annotatedElement, 'clearRect');
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([]);

            annotator._showHighlightsOnPage(0);
            expect(pageElStub).to.be.calledTwice;
            expect(threadsOnPageStub).to.be.called;
            expect(clearRectStub).to.be.called;
            expect(getContextStub).to.be.called;
        });

        it('show all the highlights on the page after clearing', () => {
            annotator._annotatedElement = {
                querySelector: () => {},
                getContext: () => {},
                clearRect: () => {}
            };
            const pageElStub = sandbox.stub(annotator._annotatedElement, 'querySelector');
            pageElStub.onCall(0).returns(annotator._annotatedElement);
            pageElStub.onCall(1).returns(annotator._annotatedElement);
            const getContextStub = sandbox.stub(annotator._annotatedElement, 'getContext').returns(annotator._annotatedElement);
            const clearRectStub = sandbox.stub(annotator._annotatedElement, 'clearRect');
            const thread = { show: () => {} };
            const threadsOnPageStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([thread, thread, thread]);
            const showStub = sandbox.stub(thread, 'show');

            annotator._showHighlightsOnPage(0);
            expect(pageElStub).to.be.calledTwice;
            expect(threadsOnPageStub).to.be.called;
            expect(clearRectStub).to.be.called;
            expect(getContextStub).to.be.called;
            expect(showStub).to.be.calledThrice;
        });
    });

    describe('_removeRangyHighlight()', () => {
        it('should do nothing if there is not an array of highlights', () => {
            annotator._highlighter = {
                highlights: [{ id: 1 }, { id: 2 }, { id: 3 }],
                filter: () => {},
                removeHighlights: () => {}
            };
            const arrayStub = sandbox.stub(Array, 'isArray').returns(false);
            const filterStub = sandbox.stub(annotator._highlighter, 'filter');
            const removeHighlightsStub = sandbox.stub(annotator._highlighter, 'removeHighlights');

            annotator._removeRangyHighlight({ id: 1 });
            expect(arrayStub).to.be.called;
            expect(filterStub).to.be.not.called;
            expect(removeHighlightsStub).to.be.not.called;
        });

        it('should call removeHighlights on any matching highlight ids', () => {
            annotator._highlighter = {
                highlights: {
                    filter: () => {},
                    ids: [1, 2, 3, 4]
                },
                removeHighlights: () => {}
            };
            const arrayStub = sandbox.stub(Array, 'isArray').returns(true);
            const filterStub = sandbox.stub(annotator._highlighter.highlights, 'filter').returns(annotator._highlighter.highlights.ids[0]);
            const removeHighlightsStub = sandbox.stub(annotator._highlighter, 'removeHighlights');

            annotator._removeRangyHighlight({ id: 1 });
            expect(arrayStub).to.be.called;
            expect(filterStub).to.be.called;
            expect(removeHighlightsStub).to.be.calledWith(annotator._highlighter.highlights.ids[0]);
        });
    });
});
