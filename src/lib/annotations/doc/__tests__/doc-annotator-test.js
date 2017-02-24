/* eslint-disable no-unused-expressions */
import rangy from 'rangy';
import Annotator from '../../annotator';
import Annotation from '../../annotation';
import Browser from '../../../browser';
import DocAnnotator from '../doc-annotator';
import DocHighlightThread from '../doc-highlight-thread';
import DocPointThread from '../doc-point-thread';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../doc-annotator-util';
import * as constants from '../../annotation-constants';


let annotator;
let stubs;
const sandbox = sinon.sandbox.create();

describe('doc-annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/doc-annotator-test.html');

        sandbox.stub(Browser, 'isMobile').returns(false);

        annotator = new DocAnnotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof annotator.destroy === 'function') {
            annotator.destroy();
            annotator = null;
        }
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

        it('should create, add highlight comment thread to internal map, and return it', () => {
            sandbox.stub(annotator, 'addThreadToMap');
            const thread = annotator.createAnnotationThread([], {}, 'highlight-comment');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
        });

        it('should create, add point thread to internal map, and return it', () => {
            sandbox.stub(annotator, 'addThreadToMap');
            const thread = annotator.createAnnotationThread([], {}, 'point');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof DocPointThread).to.be.true;
        });

        it('should create, add highlight thread to internal map with appropriate parameters', () => {
            sandbox.stub(annotator, 'addThreadToMap');
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'setup', {
                value: sandbox.stub()
            });
            const annotation = new Annotation({
                fileVersionID: 2,
                threadID: '1',
                type: 'point',
                thread: '1',
                text: 'blah',
                location: { x: 0, y: 0 }
            });
            const thread = annotator.createAnnotationThread([annotation], {}, 'highlight');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread.threadID).to.equal(annotation.threadID);
            expect(thread.thread).to.equal(annotation.thread);
            expect(thread instanceof DocHighlightThread).to.be.true;
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

    describe('isInDialogOnPage()', () => {
        it('should return true if mouse is hovering over an open dialog', () => {
            const threads = [{ _dialog: { element: {} } }];
            sandbox.stub(annotator, '_getThreadsOnPage').returns(threads);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            const result = annotator.isInDialogOnPage({}, 1);
            expect(result).to.be.true;
        });

        it('should return false if mouse is NOT hovering over an open dialog', () => {
            const threads = [{ _dialog: { element: {} } }];
            sandbox.stub(annotator, '_getThreadsOnPage').returns(threads);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            const result = annotator.isInDialogOnPage({}, 1);
            expect(result).to.be.false;
        });
    });

    describe('_getThreadsOnPage', () => {
        it('should return empty array if no page number provided', () => {
            const threads = annotator._getThreadsOnPage(-1);
            expect(threads.length).to.equal(0);
        });
    });

    describe('_highlightMousedownHandler()', () => {
        it('should get highlights on page and call their onMouse down method', () => {
            const thread = {
                onMousedown: sinon.stub(),
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            const threadPages = { 1: [thread] };
            const highlightStub = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([thread]);

            annotator._threads = threadPages;
            annotator._highlightMousedownHandler({ clientX: 1, clientY: 1 });
            expect(highlightStub).to.be.called;
            expect(thread.onMousedown).to.be.called;
        });
    });

    describe('_highlightMousemoveHandler()', () => {
        beforeEach(() => {
            annotator._throttledHighlightMousemoveHandler = false;

            stubs.thread = {
                onMousemove: sandbox.stub().returns(false),
                hideDialog: sandbox.stub(),
                show: sandbox.stub()
            };
            stubs.delayThread = {
                onMousemove: sandbox.stub().returns(true),
                hideDialog: sandbox.stub(),
                show: sandbox.stub()
            };

            stubs.getPage = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ pageEl: {}, page: 1 });
            stubs.getThreads = sandbox.stub(annotator, '_getHighlightThreadsOnPage');
        });

        it('should do nothing if the throttledHighlightMousemoveHandler already exists', () => {
            annotator._throttledHighlightMousemoveHandler = true;

            const result = annotator._highlightMousemoveHandler();

            expect(stubs.getThreads).to.not.be.called;
            expect(result).to.be.true;
        });

        it('should do nothing if there are pending, pending-active, active, or active hover highlight threads', () => {
            stubs.thread.state = constants.ANNOTATION_STATE_PENDING;
            stubs.getThreads.returns([stubs.thread]);

            const result = annotator._highlightMousemoveHandler()({ x: 1, y: 2 });

            expect(stubs.getThreads).to.be.called;
            expect(result).to.equal(undefined);
        });

        it('should not add any delayThreads if there are no threads on the current page', () => {
            stubs.getThreads.returns([]);
            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(stubs.thread.onMousemove).to.not.be.called;
        });

        it('should add delayThreads and hide innactive threads if the page is found', () => {
            stubs.getThreads.returns([stubs.thread, stubs.delayThread]);

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });

            expect(stubs.thread.onMousemove).to.be.called;
            expect(stubs.delayThread.onMousemove).to.be.called;
            expect(stubs.thread.show).to.not.be.called;
            expect(stubs.delayThread.show).to.be.called;
        });

        it('should set _didMouseMove to true if the mouse was moved enough', () => {
            stubs.getThreads.returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator._highlightMousemoveHandler()({ clientX: 10, clientY: 10 });

            expect(annotator._didMouseMove).to.equal(true);
        });

        it('should not set _didMouseMove to true if the mouse was not moved enough', () => {
            stubs.getThreads.returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });

            expect(annotator._didMouseMove).to.equal(undefined);
        });

        it('should show the top-most delayed thread, and hide all others', () => {
            stubs.getThreads.returns([stubs.delayThread, stubs.delayThread]);

            annotator._highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(stubs.delayThread.onMousemove).to.be.calledTwice;
            expect(stubs.delayThread.show).to.be.calledOnce;
            expect(stubs.delayThread.hideDialog).to.be.called;
        });
    });

    describe('_highlightMouseupHandler()', () => {
        beforeEach(() => {
            stubs.createHandlerStub = sandbox.stub(annotator, '_highlightCreateHandler');
            stubs.clickHandlerStub = sandbox.stub(annotator, '_highlightClickHandler');
        });

        it('should call highlightCreateHandler if not on mobile, and the user double clicked', () => {
            annotator._highlightMouseupHandler({ type: 'dblclick' });

            expect(stubs.createHandlerStub).to.be.called;
            expect(stubs.clickHandlerStub).to.not.be.called;
            expect(annotator._isCreatingHighlight).to.be.false;
        });

        it('should call highlightClickHandler if not on mobile, and the mouse did not move', () => {
            annotator._highlightMouseupHandler({ x: 0, y: 0 });

            expect(stubs.createHandlerStub).to.not.be.called;
            expect(stubs.clickHandlerStub).to.be.called;
            expect(annotator._isCreatingHighlight).to.be.false;
        });
    });

    describe('_highlightCreateHandler()', () => {
        beforeEach(() => {
            stubs.thread = {
                reset: sandbox.stub(),
                show: sandbox.stub()
            };

            stubs.getPage = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ pageEl: {}, page: 1 });
            stubs.hasActiveDialog = sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            stubs.getThreads = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([]);
            stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent').returns(undefined);
            stubs.createThread = sandbox.stub(annotator, 'createAnnotationThread');
            stubs.bindListeners = sandbox.stub(annotator, 'bindCustomListenersOnThread');
        });

        afterEach(() => {
            stubs.thread.state = 'inactive';
        });

        it('should stop event propogation', () => {
            const event = new Event({ x: 1, y: 1 });
            const eventStub = sandbox.stub(event, 'stopPropagation');
            annotator._highlightCreateHandler(event);
            expect(eventStub).to.be.called;
        });

        it('should do nothing if there are no pending threads', () => {
            const event = new Event({ x: 1, y: 1 });

            stubs.hasActiveDialog.returns(true);
            annotator._highlightCreateHandler(event);
            expect(stubs.thread.reset).to.not.be.called;

            stubs.getThreads.returns([stubs.thread]);
            annotator._highlightCreateHandler(event);
            expect(stubs.thread.reset).to.not.be.called;
        });

        it('should reset active highlight threads', () => {
            const event = new Event({ x: 1, y: 1 });

            stubs.thread.state = constants.ANNOTATION_STATE_ACTIVE;
            stubs.getThreads.returns([stubs.thread]);
            annotator._highlightCreateHandler(event);
            expect(stubs.thread.reset).to.be.called;

            stubs.thread.state = constants.ANNOTATION_STATE_ACTIVE_HOVER;
            stubs.getThreads.returns([stubs.thread]);
            annotator._highlightCreateHandler(event);
            expect(stubs.thread.reset).to.be.called;
        });

        it('should return before showing if the location is invalid', () => {
            const event = new Event({ x: 1, y: 1 });
            stubs.getLocation.returns(undefined);

            annotator._highlightCreateHandler(event);
            expect(stubs.getLocation).to.be.called;
            expect(stubs.createThread).to.not.be.called;
        });

        it('should show and bind listeners to a thread', () => {
            const event = new Event({ x: 1, y: 1 });
            stubs.getLocation.returns(true);
            stubs.createThread.returns(stubs.thread);

            annotator._highlightCreateHandler(event);
            expect(stubs.getLocation).to.be.called;
            expect(stubs.createThread).to.be.called;
            expect(stubs.thread.show).to.be.called;
            expect(stubs.bindListeners).to.be.called;
        });
    });

    describe('_highlightClickHandler()', () => {
        beforeEach(() => {
            stubs.event = { x: 1, y: 1 };
            stubs.thread = {
                cancelFirstComment: sandbox.stub(),
                onClick: sandbox.stub(),
                show: sandbox.stub(),
                destroy: sandbox.stub()
            };

            stubs.getPage = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber').returns({ pageEl: {}, page: 1 });
            stubs.getAllThreads = sandbox.stub(annotator, '_getThreadsWithStates').returns([]);
            stubs.getThreads = sandbox.stub(annotator, '_getHighlightThreadsOnPage').returns([stubs.thread]);
        });

        afterEach(() => {
            stubs.thread.state = 'invalid';
        });

        it('should cancel the first comment of pending threads', () => {
            stubs.thread.state = constants.ANNOTATION_STATE_PENDING;
            stubs.getAllThreads.returns([stubs.thread]);

            // Point annotation
            stubs.thread.type = constants.ANNOTATION_TYPE_POINT;
            annotator._highlightClickHandler(stubs.event);
            expect(stubs.thread.destroy).to.be.called;

            // Highlight annotation
            stubs.thread.type = constants.ANNOTATION_TYPE_HIGHLIGHT;
            annotator._highlightClickHandler(stubs.event);
            expect(stubs.thread.cancelFirstComment).to.be.called;
        });

        it('should not show a thread if it is not active', () => {
            stubs.thread.onClick.returns(false);

            annotator._highlightClickHandler(stubs.event);
            expect(stubs.thread.cancelFirstComment).to.not.be.called;
            expect(stubs.thread.onClick).to.be.calledWith(stubs.event, false);
            expect(stubs.thread.show).to.not.be.called;
        });

        it('should show an active thread on the page', () => {
            stubs.thread.onClick.returns(true);

            annotator._highlightClickHandler(stubs.event);
            expect(stubs.thread.cancelFirstComment).to.not.be.called;
            expect(stubs.thread.onClick).to.be.calledWith(stubs.event, false);
            expect(stubs.thread.show).to.be.called;
        });
    });

    describe('_getThreadsWithStates()', () => {
        it('return all of the threads in the specified state', () => {
            const thread1 = {
                type: 'highlight',
                state: constants.ANNOTATION_STATE_HOVER,
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            const thread2 = {
                type: 'point',
                state: constants.ANNOTATION_STATE_HOVER,
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            const thread3 = {
                type: 'highlight',
                state: constants.ANNOTATION_STATE_PENDING,
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            annotator._threads = { 0: [thread1, thread2], 1: [thread3] };

            const threads = annotator._getThreadsWithStates(constants.ANNOTATION_STATE_HOVER);

            expect(threads).to.deep.equal([thread1, thread2]);
        });
    });

    describe('_getHighlightThreadsOnPage()', () => {
        it('return the highlight threads on that page', () => {
            const thread = {
                type: 'highlight',
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            annotator._threads = { 0: [thread] };
            const docStub = sandbox.stub(annotatorUtil, 'isHighlightAnnotation').returns(thread);
            const threads = annotator._getHighlightThreadsOnPage(0);

            expect(docStub).to.be.calledWith('highlight');
            expect(threads).to.deep.equal([thread]);
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
