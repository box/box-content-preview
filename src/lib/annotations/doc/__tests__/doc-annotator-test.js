/* eslint-disable no-unused-expressions */
import rangy from 'rangy';
import Annotator from '../../annotator';
import Annotation from '../../annotation';
import AnnotationThread from '../../annotation-thread';
import Browser from '../../../browser';
import DocAnnotator from '../doc-annotator';
import DocHighlightThread from '../doc-highlight-thread';
import DocPointThread from '../doc-point-thread';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../doc-annotator-util';
import * as constants from '../../annotation-constants';


let annotator;
let stubs = {};
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

        stubs.getPage = sandbox.stub(docAnnotatorUtil, 'getPageElAndPageNumber');
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
        const x = 100;
        const y = 200;
        const dimensions = { x, y };
        const quadPoints = [
            [1, 2, 3, 4, 5, 6, 7, 8],
            [2, 3, 4, 5, 6, 7, 8, 9]
        ];
        let page = 3;

        beforeEach(() => {
            stubs.selection = sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
            stubs.pageEl = {
                getBoundingClientRect: sandbox.stub().returns({
                    width: dimensions.x,
                    height: dimensions.y + 30 // 15px padding top and bottom
                })
            };

            stubs.getHighlights = sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                highlight: {},
                highlightEls: []
            });

            stubs.findClosest = sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-dialog');
            stubs.scale = sandbox.stub(annotatorUtil, 'getScale').returns(1);

            // stub highlight methods
            stubs.points = sandbox.stub(docAnnotatorUtil, 'getQuadPoints');
            stubs.getSel = sandbox.stub(window, 'getSelection').returns({});
            stubs.saveSel = sandbox.stub(rangy, 'saveSelection');
            stubs.removeRangy = sandbox.stub(annotator, 'removeRangyHighlight');
            stubs.restoreSel = sandbox.stub(rangy, 'restoreSelection');
        });

        describe('point', () => {
            it('should not return a location if there is a selection present', () => {
                expect(annotator.getLocationFromEvent({}, 'point')).to.be.null;
            });

            it('should not return a location if click isn\'t on page', () => {
                stubs.selection.returns(false);
                stubs.getPage.returns({ pageEl: null, page: -1 });
                expect(annotator.getLocationFromEvent({}, 'point')).to.be.null;
            });

            it('should not return a location if click is on dialog', () => {
                stubs.selection.returns(false);
                stubs.getPage.returns({
                    pageEl: document.querySelector('.annotated-element'),
                    page: 1
                });
                expect(annotator.getLocationFromEvent({}, 'point')).to.be.null;
            });

            it('should return a valid point location if click is valid', () => {
                page = 2;

                stubs.selection.returns(false);
                stubs.getPage.returns({ pageEl: stubs.pageEl, page });
                stubs.findClosest.returns('not-a-dialog');
                sandbox.stub(docAnnotatorUtil, 'convertDOMSpaceToPDFSpace').returns([x, y]);

                const location = annotator.getLocationFromEvent({}, 'point');
                expect(location).to.deep.equal({ x, y, page, dimensions });
            });
        });

        describe('highlight', () => {
            it('should not return a location if there is no selection present', () => {
                stubs.selection.returns(false);
                expect(annotator.getLocationFromEvent({}, 'highlight')).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                stubs.getPage.onFirstCall().returns({ pageEl: null, page: -1 });
                stubs.getPage.onSecondCall().returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: 100,
                            height: 100
                        })
                    },
                    page: 2
                });

                annotator.getLocationFromEvent({}, 'highlight');
                expect(window.getSelection).to.have.been.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                stubs.getPage.returns({ pageEl: stubs.pageEl, page });
                expect(annotator.getLocationFromEvent({}, 'highlight')).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                stubs.getPage.returns({ pageEl: stubs.pageEl, page });
                stubs.points.onFirstCall().returns(quadPoints[0]);
                stubs.points.onSecondCall().returns(quadPoints[1]);

                stubs.getHighlights.returns({ highlight: {}, highlightEls: [{}, {}] });

                const location = annotator.getLocationFromEvent({}, 'highlight');
                expect(location).to.deep.equal({ page, quadPoints, dimensions });
            });
        });

        describe('highlight-comment', () => {
            it('should not return a location if there is no selection present', () => {
                stubs.selection.returns(false);
                const location = annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(location).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                const getPageStub = stubs.getPage;
                getPageStub.onFirstCall().returns({ pageEl: null, page: -1 });
                getPageStub.onSecondCall().returns({
                    pageEl: {
                        getBoundingClientRect: sandbox.stub().returns({
                            width: 100,
                            height: 100
                        })
                    },
                    page: 2
                });

                annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(window.getSelection).to.have.been.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                stubs.getPage.returns({ pageEl: stubs.pageEl, page });
                expect(annotator.getLocationFromEvent({}, 'highlight-comment')).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                stubs.getPage.returns({ pageEl: stubs.pageEl, page });
                stubs.points.onFirstCall().returns(quadPoints[0]);
                stubs.points.onSecondCall().returns(quadPoints[1]);
                stubs.getHighlights.returns({ highlight: {}, highlightEls: [{}, {}] });

                const location = annotator.getLocationFromEvent({}, 'highlight-comment');
                expect(location).to.deep.equal({ page, quadPoints, dimensions });
            });
        });
    });

    describe('createAnnotationThread()', () => {
        beforeEach(() => {
            stubs.addThread = sandbox.stub(annotator, 'addThreadToMap');
            stubs.setupFunc = AnnotationThread.prototype.setup;
        });

        afterEach(() => {
            Object.defineProperty(AnnotationThread.prototype, 'setup', { value: stubs.setupFunc });
        });

        it('should create, add highlight thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, 'highlight');
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
        });

        it('should create, add highlight comment thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, 'highlight-comment');
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
        });

        it('should create, add point thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, 'point');
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocPointThread).to.be.true;
        });

        it('should create, add highlight thread to internal map with appropriate parameters', () => {
            Object.defineProperty(AnnotationThread.prototype, 'setup', { value: sandbox.mock() });
            const annotation = new Annotation({
                fileVersionID: 2,
                threadID: '1',
                type: 'point',
                thread: '1',
                text: 'blah',
                location: { x: 0, y: 0 }
            });
            const thread = annotator.createAnnotationThread([annotation], {}, 'highlight');

            expect(stubs.addThread).to.have.been.called;
            expect(thread.threadID).to.equal(annotation.threadID);
            expect(thread.thread).to.equal(annotation.thread);
            expect(thread instanceof DocHighlightThread).to.be.true;
        });
    });

    describe('renderAnnotationsOnPage()', () => {
        const renderFunc = Annotator.prototype.renderAnnotationsOnPage;

        afterEach(() => {
            Object.defineProperty(Annotator.prototype, 'renderAnnotationsOnPage', { value: renderFunc });
        });

        it('should destroy any pending highlight annotations on the page', () => {
            const pendingThread = { state: 'pending', destroy: () => {} };
            stubs.pendingMock = sandbox.mock(pendingThread);
            stubs.pendingMock.expects('destroy');

            const inactiveThread = { state: 'inactive', destroy: () => {} };
            stubs.inactiveMock = sandbox.mock(inactiveThread);
            stubs.inactiveMock.expects('destroy').never();

            const threads = [pendingThread, inactiveThread];
            sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns(threads);
            Object.defineProperty(Annotator.prototype, 'renderAnnotationsOnPage', { value: sandbox.mock() });
            annotator.renderAnnotationsOnPage(1);
        });
    });

    describe('setupAnnotations()', () => {
        it('should call parent to setup annotations and initialize highlighter', () => {
            stubs.highlighter = { addClassApplier: sandbox.stub() };
            sandbox.stub(rangy, 'createHighlighter').returns(stubs.highlighter);

            annotator.setupAnnotations();

            expect(rangy.createHighlighter).to.have.been.called;
            expect(stubs.highlighter.addClassApplier).to.have.been.called;
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            annotator._annotatedElement = {
                addEventListener: () => {},
                removeEventListener: () => {}
            };
            stubs.elMock = sandbox.mock(annotator._annotatedElement);
        });

        it('shouldn\'t bind DOM listeners if user cannot annotate except mouseup', () => {
            annotator._annotationService.canAnnotate = false;

            stubs.elMock.expects('addEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('dblclick', sinon.match.func).never();
            stubs.elMock.expects('addEventListener').withArgs('mousedown', sinon.match.func).never();
            stubs.elMock.expects('addEventListener').withArgs('contextmenu', sinon.match.func).never();
            stubs.elMock.expects('addEventListener').withArgs('mousemove', sinon.match.func).never();
            annotator.bindDOMListeners();
        });

        it('should bind DOM listeners if user can annotate', () => {
            annotator._annotationService.canAnnotate = true;

            stubs.elMock.expects('addEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('dblclick', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('mousedown', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('contextmenu', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('mousemove', sinon.match.func);
            annotator.bindDOMListeners();
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            annotator._annotatedElement = {
                removeEventListener: () => {}
            };
            stubs.elMock = sandbox.mock(annotator._annotatedElement);
        });

        it('should not unbind DOM listeners if user cannot annotate except mouseup', () => {
            annotator._annotationService.canAnnotate = false;

            stubs.elMock.expects('removeEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('mousedown', sinon.match.func).never();
            stubs.elMock.expects('removeEventListener').withArgs('contextmenu', sinon.match.func).never();
            stubs.elMock.expects('removeEventListener').withArgs('mousemove', sinon.match.func).never();
            stubs.elMock.expects('removeEventListener').withArgs('dblclick', sinon.match.func).never();
            annotator.unbindDOMListeners();
        });

        it('should unbind DOM listeners if user can annotate', () => {
            annotator._annotationService.canAnnotate = true;

            stubs.elMock.expects('removeEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('mousedown', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('contextmenu', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('mousemove', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('dblclick', sinon.match.func);
            annotator.unbindDOMListeners();
        });
    });

    describe('bindCustomListenersOnThread()', () => {
        const bindFunc = Annotator.prototype.bindCustomListenersOnThread;

        afterEach(() => {
            Object.defineProperty(Annotator.prototype, 'bindCustomListenersOnThread', { value: bindFunc });
        });

        it('should call parent to bind custom listeners and also bind on threaddeleted', () => {
            const thread = { addListener: () => {} };
            stubs.threadMock = sandbox.mock(thread);
            stubs.threadMock.expects('addListener').withArgs('threaddeleted', sinon.match.func);

            Object.defineProperty(Annotator.prototype, 'bindCustomListenersOnThread', { value: sandbox.mock() });

            annotator.bindCustomListenersOnThread(thread);
        });
    });

    describe('isInDialogOnPage()', () => {
        beforeEach(() => {
            const threads = [{ _dialog: { element: {} } }];
            sandbox.stub(annotator, 'getThreadsOnPage').returns(threads);
            stubs.inDialog = sandbox.stub(docAnnotatorUtil, 'isInDialog');
        });

        it('should return true if mouse is hovering over an open dialog', () => {
            stubs.inDialog.returns(true);
            expect(annotator.isInDialogOnPage({}, 1)).to.be.true;
        });

        it('should return false if mouse is NOT hovering over an open dialog', () => {
            stubs.inDialog.returns(false);
            expect(annotator.isInDialogOnPage({}, 1)).to.be.false;
        });
    });

    describe('getThreadsOnPage()', () => {
        it('should return empty array if no page number provided', () => {
            const threads = annotator.getThreadsOnPage(-1);
            expect(threads.length).to.equal(0);
        });
    });

    describe('highlightMousedownHandler()', () => {
        const bindFunc = Annotator.prototype.bindCustomListenersOnThread;

        afterEach(() => {
            Object.defineProperty(Annotator.prototype, 'bindCustomListenersOnThread', { value: bindFunc });
        });

        it('should get highlights on page and call their onMouse down method', () => {
            const thread = {
                onMousedown: () => {},
                unbindCustomListenersOnThread: () => {},
                removeAllListeners: () => {}
            };
            stubs.threadMock = sandbox.mock(thread);
            stubs.threadMock.expects('onMousedown');
            stubs.highlights = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([thread]);
            annotator._threads = { 1: [thread] };

            annotator.highlightMousedownHandler({ clientX: 1, clientY: 1 });
            expect(stubs.highlights).to.be.called;
        });
    });

    describe('highlightMousemoveHandler()', () => {
        beforeEach(() => {
            annotator._throttledHighlightMousemoveHandler = false;

            stubs.thread = {
                onMousemove: () => {},
                show: () => {}
            };
            stubs.threadMock = sandbox.mock(stubs.thread);

            stubs.delayThread = {
                onMousemove: () => {},
                hideDialog: () => {},
                show: () => {},
                state: constants.ANNOTATION_STATE_HOVER
            };
            stubs.delayMock = sandbox.mock(stubs.delayThread);

            stubs.getPage = stubs.getPage.returns({ pageEl: {}, page: 1 });
            stubs.getThreads = sandbox.stub(annotator, 'getHighlightThreadsOnPage');

            stubs.clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            stubs.clock.restore();
        });

        it('should do nothing if the throttledHighlightMousemoveHandler already exists', () => {
            annotator._throttledHighlightMousemoveHandler = true;
            stubs.threadMock.expects('onMousemove').returns(false).never();
            stubs.delayMock.expects('onMousemove').returns(true).never();

            const result = annotator.highlightMousemoveHandler();

            expect(stubs.getThreads).to.not.be.called;
            expect(result).to.be.true;
        });

        it('should do nothing if there are pending, pending-active, active, or active hover highlight threads', () => {
            stubs.thread.state = constants.ANNOTATION_STATE_PENDING;
            stubs.getThreads.returns([stubs.thread]);

            const result = annotator.highlightMousemoveHandler()({ x: 1, y: 2 });

            expect(stubs.getThreads).to.be.called;
            expect(result).to.equal(undefined);
        });

        it('should not add any delayThreads if there are no threads on the current page', () => {
            stubs.threadMock.expects('onMousemove').returns(false).never();
            stubs.delayMock.expects('onMousemove').returns(true).never();
            stubs.getThreads.returns([]);
            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
        });

        it('should add delayThreads and hide innactive threads if the page is found', () => {
            stubs.getThreads.returns([stubs.thread, stubs.delayThread]);
            stubs.threadMock.expects('onMousemove').returns(false);
            stubs.delayMock.expects('onMousemove').returns(true);
            stubs.threadMock.expects('show').never();
            stubs.delayMock.expects('show');

            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
        });

        it('should not trigger other highlights if user is creating a new highlight', () => {
            stubs.getThreads.returns([]);
            annotator._isCreatingHighlight = true;
            stubs.delayMock.expects('show').never();
            stubs.delayMock.expects('hideDialog').never();
            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
        });

        it('should set _didMouseMove to true if the mouse was moved enough', () => {
            stubs.getThreads.returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator.highlightMousemoveHandler()({ clientX: 10, clientY: 10 });

            expect(annotator._didMouseMove).to.equal(true);
        });

        it('should not set _didMouseMove to true if the mouse was not moved enough', () => {
            stubs.getThreads.returns([]);
            annotator._mouseX = 0;
            annotator._mouseY = 0;

            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });

            expect(annotator._didMouseMove).to.equal(undefined);
        });

        it('should switch to the text cursor if mouse is no longer hovering over a highlight', () => {
            stubs.delayMock.expects('onMousemove').returns(false);
            stubs.getThreads.returns([stubs.delayThread]);
            sandbox.stub(annotator, 'removeDefaultCursor');

            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
            expect(annotator.removeDefaultCursor).to.not.be.called;

            stubs.clock.tick(75);
            expect(annotator.removeDefaultCursor).to.be.called;
        });

        it('should show the top-most delayed thread, and hide all others', () => {
            stubs.getThreads.returns([stubs.delayThread, stubs.delayThread]);
            stubs.delayMock.expects('onMousemove').returns(true).twice();
            stubs.delayMock.expects('show');
            stubs.delayMock.expects('hideDialog');

            annotator.highlightMousemoveHandler()({ clientX: 3, clientY: 3 });
        });
    });

    describe('highlightMouseupHandler()', () => {
        beforeEach(() => {
            stubs.create = sandbox.stub(annotator, 'highlightCreateHandler');
            stubs.click = sandbox.stub(annotator, 'highlightClickHandler');
        });

        it('should call highlightCreateHandler if not on mobile, and the user double clicked', () => {
            annotator.highlightMouseupHandler({ type: 'dblclick' });
            expect(stubs.create).to.be.called;
            expect(stubs.click).to.not.be.called;
            expect(annotator._isCreatingHighlight).to.be.false;
        });

        it('should call highlightClickHandler if not on mobile, and the mouse did not move', () => {
            annotator.highlightMouseupHandler({ x: 0, y: 0 });
            expect(stubs.create).to.not.be.called;
            expect(stubs.click).to.be.called;
            expect(annotator._isCreatingHighlight).to.be.false;
        });
    });

    describe('highlightCreateHandler()', () => {
        beforeEach(() => {
            stubs.thread = {
                reset: () => {},
                show: () => {}
            };
            stubs.threadMock = sandbox.mock(stubs.thread);

            stubs.getPage = stubs.getPage.returns({ pageEl: {}, page: 1 });
            stubs.hasActiveDialog = sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            stubs.getThreads = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);
            stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent').returns(undefined);
            stubs.createThread = sandbox.stub(annotator, 'createAnnotationThread');
            stubs.bindListeners = sandbox.stub(annotator, 'bindCustomListenersOnThread');

            stubs.event = new Event({ x: 1, y: 1 });
            stubs.stopEvent = sandbox.stub(stubs.event, 'stopPropagation');
        });

        afterEach(() => {
            stubs.thread.state = 'inactive';
        });

        it('should stop event propogation', () => {
            annotator.highlightCreateHandler(stubs.event);
            expect(stubs.stopEvent).to.be.called;
        });

        it('should do nothing if there are no pending threads', () => {
            stubs.hasActiveDialog.returns(true);
            stubs.threadMock.expects('reset').never();
            annotator.highlightCreateHandler(stubs.event);

            stubs.getThreads.returns([stubs.thread]);
            stubs.threadMock.expects('reset').never();
            annotator.highlightCreateHandler(stubs.event);
        });

        it('should reset active highlight threads', () => {
            stubs.getThreads.returns([stubs.thread]);

            stubs.thread.state = constants.ANNOTATION_STATE_ACTIVE;
            stubs.threadMock.expects('reset');
            annotator.highlightCreateHandler(stubs.event);

            stubs.thread.state = constants.ANNOTATION_STATE_ACTIVE_HOVER;
            stubs.threadMock.expects('reset');
            annotator.highlightCreateHandler(stubs.event);
        });

        it('should return before showing if the location is invalid', () => {
            stubs.getLocation.returns(undefined);

            annotator.highlightCreateHandler(stubs.event);
            expect(stubs.getLocation).to.be.called;
            expect(stubs.createThread).to.not.be.called;
        });

        it('should show and bind listeners to a thread', () => {
            stubs.getLocation.returns(true);
            stubs.createThread.returns(stubs.thread);
            stubs.threadMock.expects('show');

            annotator.highlightCreateHandler(stubs.event);
            expect(stubs.getLocation).to.be.called;
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindListeners).to.be.called;
        });
    });

    describe('highlightClickHandler()', () => {
        beforeEach(() => {
            stubs.event = { x: 1, y: 1 };
            stubs.thread = {
                cancelFirstComment: () => {},
                onClick: () => {},
                show: () => {},
                destroy: () => {}
            };
            stubs.threadMock = sandbox.mock(stubs.thread);

            stubs.getPage = stubs.getPage.returns({ pageEl: {}, page: 1 });
            stubs.getAllThreads = sandbox.stub(annotator, 'getThreadsWithStates').returns([]);
            stubs.getThreads = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([stubs.thread]);
        });

        afterEach(() => {
            stubs.thread.state = 'invalid';
        });

        it('should cancel the first comment of pending threads', () => {
            stubs.thread.state = constants.ANNOTATION_STATE_PENDING;
            stubs.getAllThreads.returns([stubs.thread]);

            // Point annotation
            stubs.thread.type = constants.ANNOTATION_TYPE_POINT;
            stubs.threadMock.expects('destroy');
            annotator.highlightClickHandler(stubs.event);

            // Highlight annotation
            stubs.thread.type = constants.ANNOTATION_TYPE_HIGHLIGHT;
            stubs.threadMock.expects('cancelFirstComment');
            annotator.highlightClickHandler(stubs.event);
        });

        it('should not show a thread if it is not active', () => {
            stubs.threadMock.expects('onClick').withArgs(stubs.event, false).returns(false);
            stubs.threadMock.expects('cancelFirstComment').never();
            stubs.threadMock.expects('show').never();
            annotator.highlightClickHandler(stubs.event);
        });

        it('should show an active thread on the page', () => {
            stubs.threadMock.expects('onClick').withArgs(stubs.event, false).returns(true);
            stubs.threadMock.expects('cancelFirstComment').never();
            stubs.threadMock.expects('show');
            annotator.highlightClickHandler(stubs.event);
        });
    });

    describe('getThreadsWithStates()', () => {
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

            const threads = annotator.getThreadsWithStates(constants.ANNOTATION_STATE_HOVER);
            expect(threads).to.deep.equal([thread1, thread2]);
        });
    });

    describe('useDefaultCursor()', () => {
        it('should use the default cursor instead of the text cursor', () => {
            annotator.useDefaultCursor();
            expect(annotator._annotatedElement).to.have.class('bp-use-default-cursor');
        });
    });

    describe('removeDefaultCursor()', () => {
        it('should use the text cursor instead of the default cursor', () => {
            annotator.removeDefaultCursor();
            expect(annotator._annotatedElement).to.not.have.class('bp-use-default-cursor');
        });
    });

    describe('getHighlightThreadsOnPage()', () => {
        it('return the highlight threads on that page', () => {
            const thread = {
                type: 'highlight',
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            annotator._threads = { 0: [thread] };
            stubs.isHighlight = sandbox.stub(annotatorUtil, 'isHighlightAnnotation').returns(thread);

            const threads = annotator.getHighlightThreadsOnPage(0);
            expect(stubs.isHighlight).to.be.calledWith('highlight');
            expect(threads).to.deep.equal([thread]);
        });
    });

    describe('showHighlightsOnPage()', () => {
        beforeEach(() => {
            stubs.getContext = sandbox.stub();
            stubs.clearRect = sandbox.stub();

            annotator._annotatedElement = {
                querySelector: () => {},
                getContext: () => {},
                clearRect: () => {}
            };
            stubs.mock = sandbox.mock(annotator._annotatedElement);
        });

        afterEach(() => {
            annotator._annotatedElement = document.querySelector('.annotated-element');
        });

        it('should not call clearRect or getContext if there is already an annotationLayerEl', () => {
            stubs.mock.expects('querySelector').returns({ querySelector: () => {} });
            stubs.mock.expects('clearRect').never();
            stubs.mock.expects('getContext').never();
            stubs.pageThreads = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);

            annotator.showHighlightsOnPage(0);
            expect(stubs.pageThreads).to.be.called;
        });

        it('should not call clearRect or getContext if there is not an annotationLayerEl', () => {
            stubs.mock.expects('querySelector').returns(annotator._annotatedElement);
            stubs.mock.expects('querySelector').returns(undefined);
            stubs.mock.expects('clearRect').never();
            stubs.mock.expects('getContext').never();
            const threadsOnPageStub = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });

        it('should call clearRect or getContext if there is an annotationLayerEl', () => {
            stubs.mock.expects('querySelector').returns(annotator._annotatedElement);
            stubs.mock.expects('querySelector').returns(annotator._annotatedElement);
            stubs.mock.expects('getContext').returns(annotator._annotatedElement);
            stubs.mock.expects('clearRect');
            const threadsOnPageStub = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });

        it('show all the highlights on the page after clearing', () => {
            stubs.mock.expects('querySelector').returns(annotator._annotatedElement);
            stubs.mock.expects('querySelector').returns(annotator._annotatedElement);
            stubs.mock.expects('getContext').returns(annotator._annotatedElement);
            stubs.mock.expects('clearRect');

            const thread = { show: () => {} };
            stubs.threadMock = sandbox.mock(thread);
            const threadsOnPageStub = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([thread, thread, thread]);
            stubs.threadMock.expects('show').thrice();

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });
    });

    describe('removeRangyHighlight()', () => {
        it('should do nothing if there is not an array of highlights', () => {
            annotator._highlighter = {
                highlights: [{ id: 1 }, { id: 2 }, { id: 3 }],
                filter: () => {},
                removeHighlights: () => {}
            };
            stubs.highlighterMock = sandbox.mock(annotator._highlighter);
            stubs.highlighterMock.expects('filter').never();
            stubs.highlighterMock.expects('removeHighlights').never();
            sandbox.stub(Array, 'isArray').returns(false);

            annotator.removeRangyHighlight({ id: 1 });
        });

        it('should call removeHighlights on any matching highlight ids', () => {
            annotator._highlighter = {
                highlights: {
                    filter: () => {},
                    ids: [1, 2, 3, 4]
                },
                filter: () => {},
                removeHighlights: () => {}
            };
            stubs.highlighterMock = sandbox.mock(annotator._highlighter);
            stubs.highlighterMock.expects('removeHighlights').withArgs(annotator._highlighter.highlights.ids[0]);

            stubs.highlightMock = sandbox.mock(annotator._highlighter.highlights);
            stubs.highlightMock.expects('filter').returns(annotator._highlighter.highlights.ids[0]);

            sandbox.stub(Array, 'isArray').returns(true);

            annotator.removeRangyHighlight({ id: 1 });
        });
    });
});
