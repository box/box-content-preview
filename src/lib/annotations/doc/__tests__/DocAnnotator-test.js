/* eslint-disable no-unused-expressions */
import rangy from 'rangy';
import Annotator from '../../Annotator';
import Annotation from '../../Annotation';
import AnnotationThread from '../../AnnotationThread';
import DocAnnotator from '../DocAnnotator';
import DocHighlightThread from '../DocHighlightThread';
import DocDrawingThread from '../DocDrawingThread';
import DocPointThread from '../DocPointThread';
import { CreateEvents } from '../CreateHighlightDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import {
    STATES,
    TYPES,
    CLASS_ANNOTATION_LAYER_HIGHLIGHT,
    DATA_TYPE_ANNOTATION_DIALOG,
    THREAD_EVENT
} from '../../annotationConstants';

let annotator;
let stubs = {};
const sandbox = sinon.sandbox.create();

const CLASS_DEFAULT_CURSOR = 'bp-use-default-cursor';

describe('lib/annotations/doc/DocAnnotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocAnnotator-test.html');

        annotator = new DocAnnotator({
            permissions: {
                canAnnotate: true
            },
            container: document,
            annotationService: {},
            fileVersionId: 1,
            isMobile: false,
            options: {},
            modeButtons: {},
            options: {
                annotator: {
                    TYPE: ['highlight', 'highlight-comment']
                }
            }
        });
        annotator.annotatedElement = annotator.getAnnotatedEl(document);
        annotator.annotationService = {};
        annotator.threads = {};

        stubs.thread = {
            threadID: '123abc',
            location: { page: 1 },
            state: STATES.pending,
            type: TYPES.highlight,
            cancelFirstComment: () => {},
            onClick: () => {},
            show: () => {},
            reset: () => {},
            destroy: () => {},
            onMousemove: () => {}
        };
        stubs.threadMock = sandbox.mock(stubs.thread);

        stubs.getPageInfo = sandbox.stub(annotatorUtil, 'getPageInfo');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        annotator.threads = {};
        if (typeof annotator.destroy === 'function') {
            annotator.destroy();
            annotator = null;
        }
        stubs = {};
    });

    describe('constructor()', () => {
        it('should not bind any plain highlight functions if they are disabled', () => {
            const annotator = new DocAnnotator({
                permissions: {
                    canAnnotate: true
                },
                container: document,
                annotationService: {},
                fileVersionId: 1,
                isMobile: false,
                options: {},
                modeButtons: {},
                options: {
                    annotator: {
                        TYPE: ['highlight-comment']
                    }
                }
            });

            const createPlain = sandbox.stub(annotator, 'createPlainHighlight');
            annotator.createHighlightDialog.emit(CreateEvents.plain);

            expect(createPlain).to.not.be.called;
        });

        it('should not bind any comment highlight functions if they are disabled', () => {
            const annotator = new DocAnnotator({
                permissions: {
                    canAnnotate: true
                },
                container: document,
                annotationService: {},
                fileVersionId: 1,
                isMobile: false,
                options: {},
                modeButtons: {},
                options: {
                    annotator: {
                        TYPE: ['highlight']
                    }
                }
            });

            const createComment = sandbox.stub(annotator, 'createHighlightThread');
            annotator.createHighlightDialog.emit(CreateEvents.commentPost);

            expect(createComment).to.not.be.called;
        });
    });

    describe('init()', () => {
        it('should add ID to annotatedElement add createHighlightDialog init listener', () => {
            annotator.createHighlightDialog = {
                addListener: sandbox.stub(),
                removeListener: sandbox.stub(),
                destroy: sandbox.stub()
            };
            stubs.add = annotator.createHighlightDialog.addListener;
            annotator.init(1);
            expect(annotator.annotatedElement.id).to.not.be.undefined;
            expect(stubs.add).to.be.calledWith(CreateEvents.init, sinon.match.func);
        });
    });

    describe('getAnnotatedEl()', () => {
        it('should return the annotated element as the document', () => {
            expect(annotator.annotatedElement).to.not.be.null;
        });
    });

    describe('getLocationFromEvent()', () => {
        const x = 100;
        const y = 200;
        const dimensions = { x, y };
        const quadPoints = [[1, 2, 3, 4, 5, 6, 7, 8], [2, 3, 4, 5, 6, 7, 8, 9]];
        let page = 3;

        beforeEach(() => {
            stubs.event = {
                clientX: x,
                clientY: y,
                target: annotator.annotatedEl
            };
            annotator.isMobile = false;

            stubs.selection = sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);
            stubs.pageEl = {
                getBoundingClientRect: sandbox.stub().returns({
                    width: dimensions.x,
                    height: dimensions.y + 30, // 15px padding top and bottom,
                    top: 0,
                    left: 0
                })
            };
            stubs.getPageInfo.returns({ pageEl: stubs.pageEl, page });

            stubs.getHighlights = sandbox.stub(docAnnotatorUtil, 'getHighlightAndHighlightEls').returns({
                highlight: {},
                highlightEls: []
            });

            stubs.findClosest = sandbox.stub(annotatorUtil, 'findClosestDataType').returns(DATA_TYPE_ANNOTATION_DIALOG);
            stubs.scale = sandbox.stub(annotatorUtil, 'getScale').returns(1);

            // stub highlight methods
            stubs.points = sandbox.stub(docAnnotatorUtil, 'getQuadPoints');
            stubs.getSel = sandbox.stub(window, 'getSelection').returns({});
            stubs.saveSel = sandbox.stub(rangy, 'saveSelection');
            stubs.removeRangy = sandbox.stub(annotator, 'removeRangyHighlight');
            stubs.restoreSel = sandbox.stub(rangy, 'restoreSelection');
        });

        it('should not return a location if no touch event is available and user is on a mobile device', () => {
            annotator.isMobile = true;
            expect(annotator.getLocationFromEvent({ targetTouches: [] }, TYPES.point)).to.be.null;
        });

        it('should replace event with mobile touch event if user is on a mobile device', () => {
            annotator.isMobile = true;
            stubs.event = {
                targetTouches: [{
                    clientX: x,
                    clientY: y,
                    target: annotator.annotatedEl
                }]
            };
            annotator.getLocationFromEvent(stubs.event, TYPES.point);
        });

        it('should not return a location if there are no touch event and the user is on a mobile device', () => {
            annotator.isMobile = true;
            expect(annotator.getLocationFromEvent(stubs.event, TYPES.point)).to.be.null;

            stubs.event = {
                targetTouches: [{
                    target: annotator.annotatedEl
                }]
            };
            annotator
            expect(annotator.getLocationFromEvent(stubs.event, TYPES.point)).to.be.null;
        });

        it('should not return a location if click isn\'t on page', () => {
            stubs.selection.returns(false);
            stubs.getPageInfo.returns({ pageEl: null, page: -1 });
            expect(annotator.getLocationFromEvent(stubs.event, TYPES.point)).to.be.null;
        });

        describe(TYPES.point, () => {
            it('should not return a location if there is a selection present', () => {
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.point)).to.be.null;
            });

            it('should not return a location if click is on dialog', () => {
                stubs.selection.returns(false);
                stubs.getPageInfo.returns({
                    pageEl: document.querySelector('.annotated-element'),
                    page: 1
                });
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.point)).to.be.null;
            });

            it('should not return a location if click event does not have coordinates', () => {
                stubs.selection.returns(false);
                stubs.findClosest.returns('not-a-dialog');
                sandbox.stub(docAnnotatorUtil, 'convertDOMSpaceToPDFSpace');

                expect(annotator.getLocationFromEvent({}, TYPES.point)).to.be.null;
                expect(docAnnotatorUtil.convertDOMSpaceToPDFSpace).to.not.be.called;
            });

            it('should return a valid point location if click is valid', () => {
                stubs.selection.returns(false);
                stubs.findClosest.returns('not-a-dialog');
                sandbox.stub(docAnnotatorUtil, 'convertDOMSpaceToPDFSpace').returns([x, y]);

                const location = annotator.getLocationFromEvent(stubs.event, TYPES.point);
                expect(location).to.deep.equal({ x, y, page, dimensions });
            });
        });

        describe(TYPES.highlight, () => {
            beforeEach(() => {
                annotator.setupAnnotations();
                stubs.highlighter = sandbox.mock(annotator.highlighter);
            });

            it('should not return a location if there is no selection present', () => {
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.highlight)).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                annotator.highlighter.highlights = [{}, {}];
                stubs.getPageInfo.returns({ pageEl: null, page: -1 });

                annotator.getLocationFromEvent(stubs.event, TYPES.highlight);
                expect(stubs.getPageInfo).to.be.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.highlight)).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                annotator.highlighter.highlights = [{}];
                stubs.points.onFirstCall().returns(quadPoints[0]);
                stubs.points.onSecondCall().returns(quadPoints[1]);

                stubs.getHighlights.returns({ highlight: {}, highlightEls: [{}, {}] });

                const location = annotator.getLocationFromEvent(stubs.event, TYPES.highlight);
                expect(location).to.deep.equal({ page, quadPoints, dimensions });
            });
        });

        describe(TYPES.highlight_comment, () => {
            beforeEach(() => {
                annotator.setupAnnotations();
                stubs.highlighter = sandbox.mock(annotator.highlighter);
            });

            it('should not return a location if there is no selection present', () => {
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.highlight_comment)).to.be.null;
            });

            it('should infer page from selection if it cannot be inferred from event', () => {
                annotator.highlighter.highlights = [{}, {}];
                stubs.getPageInfo.returns({ pageEl: null, page: -1 });

                annotator.getLocationFromEvent(stubs.event, TYPES.highlight_comment);
                expect(stubs.getPageInfo).to.be.called;
            });

            it('should not return a valid highlight location if no highlights exist', () => {
                annotator.highlighter.highlights = [{}];
                expect(annotator.getLocationFromEvent(stubs.event, TYPES.highlight_comment)).to.deep.equal(null);
            });

            it('should return a valid highlight location if selection is valid', () => {
                annotator.highlighter.highlights = [{}];
                stubs.points.onFirstCall().returns(quadPoints[0]);
                stubs.points.onSecondCall().returns(quadPoints[1]);
                stubs.getHighlights.returns({ highlight: {}, highlightEls: [{}, {}] });

                const location = annotator.getLocationFromEvent(stubs.event, TYPES.highlight_comment);
                expect(location).to.deep.equal({ page, quadPoints, dimensions });
            });
        });
    });

    describe('createAnnotationThread()', () => {
        beforeEach(() => {
            stubs.addThread = sandbox.stub(annotator, 'addThreadToMap');
            stubs.setupFunc = AnnotationThread.prototype.setup;
            stubs.validateThread = sandbox.stub(annotatorUtil, 'validateThreadParams').returns(true);
            sandbox.stub(annotator, 'handleValidationError');
            annotator.notification = {
                show: sandbox.stub()
            };
        });

        afterEach(() => {
            Object.defineProperty(AnnotationThread.prototype, 'setup', { value: stubs.setupFunc });
        });

        it('should create, add highlight thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, TYPES.highlight);
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should create, add highlight comment thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, TYPES.highlight_comment);
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocHighlightThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should create, add point thread to internal map, and return it', () => {
            const thread = annotator.createAnnotationThread([], {}, TYPES.point);
            expect(stubs.addThread).to.have.been.called;
            expect(thread instanceof DocPointThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should create, add highlight thread to internal map with appropriate parameters', () => {
            Object.defineProperty(AnnotationThread.prototype, 'setup', { value: sandbox.mock() });
            const annotation = new Annotation({
                fileVersionId: 2,
                threadID: '1',
                type: TYPES.point,
                threadNumber: '1',
                text: 'blah',
                location: { x: 0, y: 0 }
            });
            const thread = annotator.createAnnotationThread([annotation], {}, TYPES.highlight);

            expect(stubs.addThread).to.have.been.called;
            expect(thread.threadID).to.equal(annotation.threadID);
            expect(thread.threadNumber).to.equal(annotation.threadNumber);
            expect(thread instanceof DocHighlightThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should create drawing thread and return it without adding it to the internal thread map', () => {
            const thread = annotator.createAnnotationThread([], {}, TYPES.draw);
            expect(stubs.addThread).to.not.have.been.called;
            expect(thread instanceof DocDrawingThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should emit error and return undefined if thread params are invalid', () => {
            stubs.validateThread.returns(false);
            const thread = annotator.createAnnotationThread([], {}, TYPES.highlight);
            expect(thread instanceof DocHighlightThread).to.be.false;
            expect(thread).to.be.empty;
            expect(annotator.handleValidationError).to.be.called;
        });
    });

    describe('createPlainHighlight()', () => {
        beforeEach(() => {
            sandbox.stub(annotator, 'highlightCurrentSelection');
            sandbox.stub(annotator, 'createHighlightThread');
            annotator.createPlainHighlight();
        });

        it('should invoke highlightCurrentSelection()', () => {
            expect(annotator.highlightCurrentSelection).to.be.called;
        });

        it('should invoke createHighlightThread()', () => {
            expect(annotator.createHighlightThread).to.be.called;
        });
    });

    describe('createHighlightThread()', () => {
        let thread;
        let dialog;
        beforeEach(() => {
            stubs.hideDialog = sandbox.stub(annotator.createHighlightDialog, 'hide');
            stubs.getLocationFromEvent = sandbox.stub(annotator, 'getLocationFromEvent');
            stubs.createAnnotationThread = sandbox.stub(annotator, 'createAnnotationThread');
            stubs.bindCustomListenersOnThread = sandbox.stub(annotator, 'bindCustomListenersOnThread');
            stubs.renderAnnotationsOnPage = sandbox.stub(annotator, 'renderAnnotationsOnPage');

            annotator.highlighter = {
                removeAllHighlights: () => {}
            };
            stubs.removeAllHighlights = sandbox.stub(annotator.highlighter, 'removeAllHighlights');

            dialog = {
                hasComments: false,
                drawAnnotation: sandbox.stub(),
                postAnnotation: sandbox.stub()
            };

            thread = {
                dialog,
                show: sandbox.stub(),
                getThreadEventData: sandbox.stub()
            };
        });

        it('should do nothing and return null if empty string passed in', () => {
            annotator.lastHighlightEvent = {};

            annotator.createHighlightThread('');
            expect(stubs.hideDialog).to.not.be.called;
        });

        it('should do nothing and return null if there was no highlight event on the previous action', () => {
            annotator.lastHighlightEvent = null;

            annotator.createHighlightThread('some text');
            expect(stubs.hideDialog).to.not.be.called;
        });

        it('should do nothing and return null if not a valid annotation location', () => {
            annotator.lastHighlightEvent = {};
            stubs.getLocationFromEvent.returns(null);

            annotator.createHighlightThread('some text');
            expect(stubs.createAnnotationThread).to.not.be.called;
        });

        it('should create an annotation thread off of the highlight selection by invoking createAnnotationThread() with correct type', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            annotator.createHighlightThread('some text with severe passive agression');
            expect(stubs.createAnnotationThread).to.be.calledWith([], location, TYPES.highlight_comment);
        });

        it('should bail out of making an annotation if thread is null', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(null);

            annotator.createHighlightThread('some text');
            expect(stubs.bindCustomListenersOnThread).to.not.be.called;
        });

        it('should render the annotation thread dialog if it is a basic annotation type', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            annotator.createHighlightThread();
            expect(dialog.drawAnnotation).to.be.called;
        });

        it('should set the dialog to have comments if it is a comment-highlight', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            annotator.createHighlightThread('I think this document should be more better');
            expect(dialog.hasComments).to.be.true;
        });

        it('should show the annotation', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            annotator.createHighlightThread();
            expect(thread.show).to.be.called;
        });

        it('should post the annotation via the dialog', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);
            const text = 'This is an annotation pointing out a mistake in the document!';

            annotator.createHighlightThread(text);
            expect(dialog.postAnnotation).to.be.calledWith(text);
        });

        it('should bind event listeners by invoking bindCustomListenersOnThread()', () => {
            annotator.lastHighlightEvent = {};
            const location = { page: 1 };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            annotator.createHighlightThread();
            expect(stubs.bindCustomListenersOnThread).to.be.calledWith(thread);
        });

        it('should return an annotation thread', () => {
            annotator.lastHighlightEvent = {};
            const page = 999999999;
            const location = { page };
            stubs.getLocationFromEvent.returns(location);
            stubs.createAnnotationThread.returns(thread);

            expect(annotator.createHighlightThread()).to.deep.equal(thread);
        });
    });

    describe('renderAnnotationsOnPage()', () => {

        beforeEach(() => {
            sandbox.stub(annotator, 'scaleAnnotationCanvases');
        });

        it('should destroy any pending highlight annotations on the page', () => {
            const pendingThread = { state: 'pending', destroy: () => {} };
            stubs.pendingMock = sandbox.mock(pendingThread);
            stubs.pendingMock.expects('destroy');

            const inactiveThread = { state: 'inactive', destroy: () => {} };
            stubs.inactiveMock = sandbox.mock(inactiveThread);
            stubs.inactiveMock.expects('destroy').never();

            stubs.isPending = sandbox.stub(annotatorUtil, 'isPending').returns(false);
            stubs.isPending.withArgs(STATES.pending).returns(true);

            const threads = [pendingThread, inactiveThread];
            sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns(threads);

            annotator.renderAnnotationsOnPage(1);
            expect(annotator.scaleAnnotationCanvases).to.be.called;
        });

        it('should call show on ONLY enabled annotation types', () => {
            const plain = { state: 'I do not care', type: 'highlight', show: sandbox.stub() };
            const comment = { state: 'I do not care', type: 'highlight-comment', show: sandbox.stub() };
            const point = { state: 'I do not care', type: 'point', show: sandbox.stub() };
            const threads = [plain, comment, point];
            annotator.threads = { 1: threads };
            sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns(threads);
            annotator.options.annotator.TYPE = ['highlight', 'point'];

            annotator.renderAnnotationsOnPage(1);

            expect(plain.show).to.be.called;
            expect(point.show).to.be.called;
            expect(comment.show).to.not.be.called;

            annotator.threads = {};
        });
    });

    describe('scaleAnnotationCanvases()', () => {
        beforeEach(() => {
            stubs.scaleCanvas = sandbox.stub(docAnnotatorUtil, 'scaleCanvas');

            // Add pageEl
            stubs.pageEl = document.createElement('div');
            stubs.pageEl.setAttribute('data-page-number', 1);
            annotator.annotatedElement.appendChild(stubs.pageEl);
        });

        it('should do nothing if annotation layer is not present', () => {
            annotator.scaleAnnotationCanvases(1);
            expect(stubs.scaleCanvas).to.not.be.called;
        });

        it('should scale canvas if annotation layer is present', () => {
            const annotationLayerEl = document.createElement('canvas');
            annotationLayerEl.classList.add(CLASS_ANNOTATION_LAYER_HIGHLIGHT);
            stubs.pageEl.appendChild(annotationLayerEl);

            annotator.scaleAnnotationCanvases(1);
            expect(stubs.scaleCanvas).to.be.calledOnce;
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

        it('should not create a highlighter if all forms of highlight are disabled', () => {
            sandbox.stub(rangy, 'createHighlighter');
            annotator.plainHighlightEnabled = false;
            annotator.commentHighlightEnabled = false;

            annotator.setupAnnotations();

            expect(rangy.createHighlighter).to.not.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            annotator.annotatedElement = {
                addEventListener: () => {},
                removeEventListener: () => {}
            };
            stubs.elMock = sandbox.mock(annotator.annotatedElement);
        });

        it('should bind DOM listeners if user can annotate', () => {
            annotator.permissions.canAnnotate = true;

            stubs.elMock.expects('addEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('dblclick', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('mousedown', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('contextmenu', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('mousemove', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('click', sinon.match.func)
            annotator.bindDOMListeners();
        });

        it('should bind selectionchange and touchstart event, on the document, if on mobile and can annotate', () => {
            annotator.permissions.canAnnotate = true;
            annotator.isMobile = true;
            annotator.hasTouch = true;

            const docListen = sandbox.spy(document, 'addEventListener');
            const annotatedElementListen = sandbox.spy(annotator.annotatedElement, 'addEventListener');

            annotator.bindDOMListeners();

            expect(docListen).to.be.calledWith('selectionchange', sinon.match.func);
            expect(annotatedElementListen).to.be.calledWith('touchstart', sinon.match.func);
        });

        it('should not bind selection change event if both annotation types are disabled, and touch enabled, mobile enabled', () => {
            annotator.permissions.canAnnotate = true;
            annotator.isMobile = true;
            annotator.hasTouch = true;
            annotator.plainHighlightEnabled = false;
            annotator.commentHighlightEnabled = false;

            const docListen = sandbox.spy(document, 'addEventListener');
            const annotatedElementListen = sandbox.spy(annotator.annotatedElement, 'addEventListener');

            annotator.bindDOMListeners();

            expect(docListen).to.not.be.calledWith('selectionchange', sinon.match.func);
            expect(annotatedElementListen).to.be.calledWith('touchstart', sinon.match.func);
        });

        it('should not bind selection change event if both annotation types are disabled, and touch disabled, mobile disabled', () => {
            annotator.permissions.canAnnotate = true;
            annotator.isMobile = false;
            annotator.hasTouch = false;
            annotator.plainHighlightEnabled = false;
            annotator.commentHighlightEnabled = false;

            stubs.elMock.expects('addEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('addEventListener').withArgs('click', sinon.match.func);
            stubs.elMock.expects('addEventListener').never().withArgs('dblclick', sinon.match.func);
            stubs.elMock.expects('addEventListener').never().withArgs('mousedown', sinon.match.func);
            stubs.elMock.expects('addEventListener').never().withArgs('contextmenu', sinon.match.func);
            stubs.elMock.expects('addEventListener').never().withArgs('mousemove', sinon.match.func);

            annotator.bindDOMListeners();
        });

    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            annotator.annotatedElement = {
                removeEventListener: () => {}
            };
            stubs.elMock = sandbox.mock(annotator.annotatedElement);
            annotator.highlightMousemoveHandler = () => {};
        });

        it('should unbind DOM listeners if user can annotate', () => {
            annotator.permissions.canAnnotate = true;

            stubs.elMock.expects('removeEventListener').withArgs('mouseup', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('mousedown', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('contextmenu', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('mousemove', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('dblclick', sinon.match.func);
            stubs.elMock.expects('removeEventListener').withArgs('click', sinon.match.func);
            annotator.unbindDOMListeners();
        });

        it('should stop and destroy the requestAnimationFrame handle created by getHighlightMousemoveHandler()', () => {
            const rafHandle = 12; // RAF handles are integers
            annotator.permissions.canAnnotate = true;
            annotator.highlightThrottleHandle = rafHandle;
            sandbox.stub(annotator, 'getHighlightMouseMoveHandler').returns(sandbox.stub());

            const cancelRAFStub = sandbox.stub(window, 'cancelAnimationFrame');
            annotator.unbindDOMListeners();

            expect(cancelRAFStub).to.be.calledWith(rafHandle);
            expect(annotator.highlightThrottleHandle).to.not.exist;
        });

        it('should unbind selectionchange event, on the document, if on mobile, has touch and can annotate', () => {
            annotator.permissions.canAnnotate = true;
            annotator.isMobile = true;
            annotator.hasTouch = true;
            const docStopListen = sandbox.spy(document, 'removeEventListener');
            const annotatedElementStopListen = sandbox.spy(annotator.annotatedElement, 'removeEventListener');

            annotator.unbindDOMListeners();

            expect(docStopListen).to.be.calledWith('selectionchange', sinon.match.func);
            expect(annotatedElementStopListen).to.be.calledWith('touchstart', sinon.match.func);
        });

        it('should tell controllers to clean up selections', () => {
            annotator.permissions.canAnnotate = true;
            annotator.modeControllers = {
                'test': {
                    removeSelection: sandbox.stub()
                }
            };

            annotator.unbindDOMListeners();
            expect(annotator.modeControllers['test'].removeSelection).to.be.called;
        });
    });

    describe('highlightCurrentSelection()', () => {
        beforeEach(() => {
            annotator.setupAnnotations();
        });

        it('should do nothing if no highlighter reference', () => {
            const highlightSelection = sandbox.stub(annotator.highlighter, 'highlightSelection');
            annotator.highlighter = null;

            annotator.highlightCurrentSelection();

            expect(highlightSelection).to.not.be.called;
        });

        it('should invoke highlighter.highlightSelection()', () => {
            const highlightSelection = sandbox.stub(annotator.highlighter, 'highlightSelection');

            annotator.highlightCurrentSelection();

            expect(highlightSelection).to.be.called;
        });

        it('should invoke highlighter.highlightSelection() with the annotated element\'s id', () => {
            const highlightSelection = sandbox.stub(annotator.highlighter, 'highlightSelection');

            annotator.highlightCurrentSelection();

            expect(highlightSelection).to.be.calledWith('rangy-highlight', { containerElementId: 'doc-annotator-el' });
        });
    });

    describe('highlightMousedownHandler()', () => {
        const bindFunc = Annotator.prototype.bindCustomListenersOnThread;

        afterEach(() => {
            Object.defineProperty(Annotator.prototype, 'bindCustomListenersOnThread', { value: bindFunc });
        });

        it('should get highlights on page and call their onMouse down method', () => {
            const thread = {
                location: { page: 1 },
                onMousedown: () => {},
                unbindCustomListenersOnThread: () => {},
                removeAllListeners: () => {}
            };
            stubs.threadMock = sandbox.mock(thread);
            stubs.threadMock.expects('onMousedown');
            stubs.highlights = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([thread]);

            annotator.addThreadToMap(thread);

            annotator.highlightMousedownHandler({ clientX: 1, clientY: 1 });
            expect(stubs.highlights).to.be.called;
        });
    });

    describe('getHighlightMouseMoveHandler()', () => {
        beforeEach(() => {
            annotator.highlightMousemoveHandler = false;

            // Request animation frame stub
            stubs.RAF = sandbox.stub(window, 'requestAnimationFrame');
        });

        it('should do nothing if the highlightMousemoveHandler already exists', () => {
            annotator.highlightMousemoveHandler = true;
            const result = annotator.getHighlightMouseMoveHandler();

            expect(stubs.RAF).to.not.be.called;
            expect(result).to.be.true;
        });
    });

    describe('onHighlightMouseMove()', () => {
        it('should set didMouseMove to true if the mouse was moved enough', () => {
            annotator.mouseX = 0;
            annotator.mouseY = 0;

            annotator.onHighlightMouseMove({ clientX: 10, clientY: 10 });

            expect(annotator.didMouseMove).to.equal(true);
        });

        it('should not set didMouseMove to true if the mouse was not moved enough', () => {
            annotator.mouseX = 0;
            annotator.mouseY = 0;

            annotator.onHighlightMouseMove({ clientX: 3, clientY: 3 });

            expect(annotator.didMouseMove).to.equal(undefined);
        });

        it('should assign the mouseMoveEvent if the annotator is highlighting', () => {
            const moveEvent = { clientX: 10, clientY: 10 };
            annotator.mouseX = 0;
            annotator.mouseY = 0;

            annotator.onHighlightMouseMove(moveEvent);

            expect(annotator.mouseMoveEvent).to.deep.equal(moveEvent);
        });

        it('should not assign the mouseMoveEvent if the annotator is highlighting', () => {
            const moveEvent = { clientX: 10, clientY: 10 };
            annotator.mouseX = 0;
            annotator.mouseY = 0;
            annotator.isCreatingHighlight = true;

            annotator.onHighlightMouseMove(moveEvent);

            expect(annotator.mouseMoveEvent).to.not.deep.equal(moveEvent);
        });
    });

    describe('onHighlightCheck()', () => {
        beforeEach(() => {
            stubs.thread = {
                threadID: '123abc',
                location: { page : 1 },
                type: TYPES.highlight,
                onMousemove: () => {},
                show: () => {}
            };
            stubs.threadMock = sandbox.mock(stubs.thread);

            stubs.delayThread = {
                threadID: '456def',
                location: { page : 1 },
                type: TYPES.highlight,
                onMousemove: () => {},
                hideDialog: () => {},
                show: () => {},
                state: STATES.hover
            };
            stubs.delayMock = sandbox.mock(stubs.delayThread);

            stubs.delayThread2 = {
                threadID: '789ghi',
                location: { page : 1 },
                type: TYPES.highlight,
                onMousemove: () => {},
                hideDialog: () => {},
                show: () => {},
                state: STATES.hover
            };
            stubs.delay2Mock = sandbox.mock(stubs.delayThread2);

            stubs.getPageInfo = stubs.getPageInfo.returns({ pageEl: {}, page: 1 });
            stubs.clock = sinon.useFakeTimers();
            stubs.isDialog = sandbox.stub(docAnnotatorUtil, 'isDialogDataType');

            let timer = 0;
            window.performance = window.performance || { now: () => {} };
            sandbox.stub(window.performance, 'now', () => {
                return (timer += 500);
            });

            annotator.isCreatingHighlight = false;
        });

        afterEach(() => {
            stubs.clock.restore();
            annotator.threads = {};
        });

        it('should not do anything if user is creating a highlight', () => {
            stubs.threadMock.expects('onMousemove').returns(false).never();
            stubs.delayMock.expects('onMousemove').returns(true).never();
            annotator.isCreatingHighlight = true;

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
            expect(stubs.isDialog).to.not.be.called;
        });

        it('should not add any delayThreads if there are no threads on the current page', () => {
            stubs.threadMock.expects('onMousemove').returns(false).never();
            stubs.delayMock.expects('onMousemove').returns(true).never();

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
        });

        it('should add delayThreads and hide innactive threads if the page is found', () => {
            annotator.addThreadToMap(stubs.thread);
            annotator.addThreadToMap(stubs.delayThread);
            stubs.threadMock.expects('onMousemove').returns(false);
            stubs.delayMock.expects('onMousemove').returns(true);
            stubs.threadMock.expects('show').never();
            stubs.delayMock.expects('show');

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
        });

        it('should not trigger other highlights if user is creating a new highlight', () => {
            annotator.isCreatingHighlight = true;
            stubs.delayMock.expects('show').never();
            stubs.delayMock.expects('hideDialog').never();

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
        });

        it('should switch to the text cursor if mouse is no longer hovering over a highlight', () => {
            stubs.delayMock.expects('onMousemove').returns(false);
            annotator.addThreadToMap(stubs.delayThread);
            sandbox.stub(annotator, 'removeDefaultCursor');

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();

            expect(annotator.removeDefaultCursor).to.not.be.called;

            stubs.clock.tick(75);
            expect(annotator.removeDefaultCursor).to.be.called;
        });

        it('should switch to the hand cursor if mouse is hovering over a highlight', () => {
            stubs.delayMock.expects('onMousemove').returns(true);
            sandbox.stub(annotator, 'useDefaultCursor');
            annotator.addThreadToMap(stubs.delayThread);

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();

            expect(annotator.useDefaultCursor).to.be.called;
        });

        it('should show the top-most delayed thread, and hide all others', () => {
            annotator.addThreadToMap(stubs.delayThread);
            annotator.addThreadToMap(stubs.delayThread2);

            stubs.delayMock.expects('onMousemove').returns(true);
            stubs.delayMock.expects('show');

            stubs.delay2Mock.expects('onMousemove').returns(true);
            stubs.delay2Mock.expects('hideDialog');

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
        });

        it('should do nothing if there are pending, pending-active, active, or active hover highlight threads', () => {
            stubs.thread.state = STATES.pending;
            annotator.addThreadToMap(stubs.thread);
            stubs.threadMock.expects('onMousemove').returns(false).never();

            annotator.mouseMoveEvent = { clientX: 3, clientY: 3 };
            annotator.onHighlightCheck();
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
            expect(annotator.isCreatingHighlight).to.be.false;
        });

        it('should call highlightClickHandler if not on mobile, and the mouse did not move', () => {
            annotator.highlightMouseupHandler({ x: 0, y: 0 });
            expect(stubs.create).to.not.be.called;
            expect(stubs.click).to.be.called;
            expect(annotator.isCreatingHighlight).to.be.false;
        });

        it('should call highlighter.removeAllHighlghts', () => {
            annotator.setupAnnotations();
            const removeAll = sandbox.stub(annotator.highlighter, 'removeAllHighlights');
            annotator.highlightMouseupHandler({ x: 0, y: 0 });
            expect(removeAll).to.be.called;
        });
    });

    describe('onSelectionChange()', () => {
        beforeEach(() => {
            annotator.setupAnnotations();
        });

        it('should do nothing if focus is on a text input element', () => {
            const textAreaEl = document.createElement('textarea');
            annotator.annotatedElement.appendChild(textAreaEl);
            textAreaEl.focus();
            const getSelStub = sandbox.stub(window, 'getSelection');

            annotator.onSelectionChange({
                nodeName: 'textarea'
            });

            expect(getSelStub).to.not.be.called;
        });

        it('should clear out previous highlights if a new highlight range is being created', () => {
            const selection = {
                anchorNode: 'derp',
                toString: () => '' // Causes invalid selection
            };
            const lastSelection = {
                anchorNode: 'not_derp'
            };
            annotator.lastSelection = lastSelection;
            sandbox.stub(window, 'getSelection').returns(selection);
            const removeHighlights = sandbox.stub(annotator.highlighter, 'removeAllHighlights');

            annotator.onSelectionChange({});

            expect(removeHighlights).to.be.called;
        });

        it('should clear out highlights and exit "annotation creation" mode if an invalid selection', () => {
            const selection = {
                toString: () => '' // Causes invalid selection
            };
            sandbox.stub(window, 'getSelection').returns(selection);
            annotator.lastSelection = selection;
            annotator.lastHighlightEvent = {};
            const dialogHide = sandbox.stub(annotator.createHighlightDialog, 'hide');
            const removeAllHighlights = sandbox.stub(annotator.highlighter, 'removeAllHighlights');

            annotator.onSelectionChange({});

            expect(annotator.lastSelection).to.be.null;
            expect(annotator.lastHighlightEvent).to.be.null;
            expect(dialogHide).to.be.called;
            expect(removeAllHighlights).to.be.called;
        });

        it('should show the createHighlightDialog if it isn\'t already shown', () => {
            const selection = {
                rangeCount: 10,
                isCollapsed: false,
                toString: () => 'asdf'
            };
            sandbox.stub(window, 'getSelection').returns(selection);
            annotator.lastSelection = selection;
            annotator.lastHighlightEvent = {};
            const dialogShow = sandbox.stub(annotator.createHighlightDialog, 'show');
            annotator.createHighlightDialog.isVisible = false;
            const removeAllHighlights = sandbox.stub(annotator.highlighter, 'removeAllHighlights');

            annotator.onSelectionChange({});

            expect(dialogShow).to.be.calledWith(annotator.container);
        });

        it('should set all of the highlight annotations on the page to "inactive" state', () => {
            const selection = {
                rangeCount: 10,
                isCollapsed: false,
                toString: () => 'asdf'
            };
            const thread = {
                location: { page: 1 },
                state: STATES.hover,
                reset: () => {},
                removeAllListeners: () => {}
            };
            const threadMock = sandbox.mock(thread);
            threadMock.expects('reset');
            annotator.lastHighlightEvent = {};
            annotator.addThreadToMap(thread);

            sandbox.stub(window, 'getSelection').returns(selection);
            sandbox.stub(annotator.createHighlightDialog, 'show');
            sandbox.stub(annotator.highlighter, 'removeAllHighlights');
            sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([thread]);

            annotator.onSelectionChange({});
        });
    });

    describe('highlightCreateHandler()', () => {
        let selection;
        let createDialog;
        let pageInfo;

        beforeEach(() => {
            selection = {
                rangeCount: 0
            };
            pageInfo = { pageEl: {}, page: 1 };

            stubs.getPageInfo = stubs.getPageInfo.returns(pageInfo);
            stubs.hasActiveDialog = sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            stubs.getThreads = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);
            stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent').returns(undefined);
            stubs.createThread = sandbox.stub(annotator, 'createAnnotationThread');
            stubs.bindListeners = sandbox.stub(annotator, 'bindCustomListenersOnThread');
            stubs.getSel = sandbox.stub(window, 'getSelection');

            stubs.event = new Event({ x: 1, y: 1 });
            stubs.stopEvent = sandbox.stub(stubs.event, 'stopPropagation');
            stubs.getSel.returns(selection);

            createDialog = sandbox.mock(annotator.createHighlightDialog);
        });

        afterEach(() => {
            stubs.thread.state = 'inactive';
        });

        it('should stop event propogation', () => {
            annotator.highlightCreateHandler(stubs.event);
            expect(stubs.stopEvent).to.be.called;
        });

        it('should do nothing if there are no selections present', () => {
            selection.rangeCount = 0;
            stubs.threadMock.expects('reset').never();
        });

        it('should do nothing if the selection is collapsed', () => {
            selection.rangeCount = 1;
            selection.isCollapsed = true;
            stubs.threadMock.expects('reset').never();
        });

        it('should show the create highlight dialog', () => {
            const pageRect = {
                top: 0,
                left: 0
            };
            const rect = {
                right: 10,
                bottom: 10
            };
            pageInfo.pageEl.getBoundingClientRect = sandbox.stub().returns(pageRect);
            selection.rangeCount = 1;
            selection.getRangeAt = sandbox.stub().returns({
                getClientRects: sandbox.stub().returns([rect])
            });

            createDialog.expects('show').withArgs(pageInfo.pageEl);
            createDialog.expects('setPosition');

            annotator.highlightCreateHandler(stubs.event);
        });

        it('should position the create highlight dialog, if not on mobile', () => {
            const pageRect = {
                top: 0,
                left: 0
            };
            const rect = {
                right: 50,
                bottom: 50
            };
            pageInfo.pageEl.getBoundingClientRect = sandbox.stub().returns(pageRect);
            selection.rangeCount = 1;
            selection.getRangeAt = sandbox.stub().returns({
                getClientRects: sandbox.stub().returns([rect])
            });
            annotator.isMobile = false;

            createDialog.expects('show');
            createDialog.expects('setPosition').withArgs(50, 35); // 35 with page padding

            annotator.highlightCreateHandler(stubs.event);
        });
    });

    describe('highlightClickHandler()', () => {
        beforeEach(() => {
            stubs.event = { x: 1, y: 1 };
            annotator.addThreadToMap(stubs.thread);

            stubs.getPageInfo = stubs.getPageInfo.returns({ pageEl: {}, page: 1 });
        });

        afterEach(() => {
            stubs.thread.state = 'invalid';
            annotator.threads = {};
        });

        it('should cancel the first comment of pending point thread', () => {
            stubs.thread.type = TYPES.point;
            stubs.threadMock.expects('destroy');
            annotator.highlightClickHandler(stubs.event);
        });

        it('should cancel the first comment of pending highlight thread', () => {
            stubs.threadMock.expects('cancelFirstComment');
            annotator.highlightClickHandler(stubs.event);
        });

        it('should not show a thread if it is not active', () => {
            stubs.thread.state = STATES.inactive;
            stubs.threadMock.expects('onClick').withArgs(stubs.event, false).returns(false);
            stubs.threadMock.expects('cancelFirstComment').never();
            stubs.threadMock.expects('show').never();
            annotator.highlightClickHandler(stubs.event);
        });

        it('should show an active thread on the page', () => {
            stubs.thread.state = STATES.inactive;
            stubs.threadMock.expects('onClick').withArgs(stubs.event, false).returns(true);
            stubs.threadMock.expects('cancelFirstComment').never();
            stubs.threadMock.expects('show');
            annotator.highlightClickHandler(stubs.event);
        });
    });

    describe('useDefaultCursor()', () => {
        it('should use the default cursor instead of the text cursor', () => {
            annotator.useDefaultCursor();
            expect(annotator.annotatedElement).to.have.class(CLASS_DEFAULT_CURSOR);
        });
    });

    describe('removeDefaultCursor()', () => {
        it('should use the text cursor instead of the default cursor', () => {
            annotator.removeDefaultCursor();
            expect(annotator.annotatedElement).to.not.have.class(CLASS_DEFAULT_CURSOR);
        });
    });

    describe('getHighlightThreadsOnPage()', () => {
        it('return the highlight threads on that page', () => {
            const thread = {
                location: { page: 1 },
                type: TYPES.highlight,
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            annotator.addThreadToMap(thread);
            stubs.isHighlight = sandbox.stub(annotatorUtil, 'isHighlightAnnotation').returns(thread);

            const threads = annotator.getHighlightThreadsOnPage(1);
            expect(stubs.isHighlight).to.be.calledWith(TYPES.highlight);
            expect(threads).to.deep.equal([thread]);
        });
    });

    describe('showHighlightsOnPage()', () => {
        beforeEach(() => {
            stubs.getContext = sandbox.stub();
            stubs.clearRect = sandbox.stub();

            annotator.annotatedElement = {
                querySelector: () => {},
                getContext: () => {},
                clearRect: () => {}
            };
            stubs.mock = sandbox.mock(annotator.annotatedElement);
        });

        afterEach(() => {
            annotator.annotatedElement = document.querySelector('.annotated-element');
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
            stubs.mock.expects('querySelector').returns(annotator.annotatedElement);
            stubs.mock.expects('querySelector').returns(undefined);
            stubs.mock.expects('clearRect').never();
            stubs.mock.expects('getContext').never();
            const threadsOnPageStub = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });

        it('should call clearRect or getContext if there is an annotationLayerEl', () => {
            stubs.mock.expects('querySelector').returns(annotator.annotatedElement);
            stubs.mock.expects('querySelector').returns(annotator.annotatedElement);
            stubs.mock.expects('getContext').returns(annotator.annotatedElement);
            stubs.mock.expects('clearRect');
            const threadsOnPageStub = sandbox.stub(annotator, 'getHighlightThreadsOnPage').returns([]);

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });

        it('show all the highlights on the page after clearing', () => {
            stubs.mock.expects('querySelector').returns(annotator.annotatedElement);
            stubs.mock.expects('querySelector').returns(annotator.annotatedElement);
            stubs.mock.expects('getContext').returns(annotator.annotatedElement);
            stubs.mock.expects('clearRect');

            const thread = { show: () => {} };
            stubs.threadMock = sandbox.mock(thread);
            const threadsOnPageStub = sandbox
                .stub(annotator, 'getHighlightThreadsOnPage')
                .returns([thread, thread, thread]);
            stubs.threadMock.expects('show').thrice();

            annotator.showHighlightsOnPage(0);
            expect(threadsOnPageStub).to.be.called;
        });
    });

    describe('removeRangyHighlight()', () => {
        it('should do nothing if there is not an array of highlights', () => {
            annotator.highlighter = {
                highlights: [{ id: 1 }, { id: 2 }, { id: 3 }],
                filter: () => {},
                removeHighlights: () => {}
            };
            stubs.highlighterMock = sandbox.mock(annotator.highlighter);
            stubs.highlighterMock.expects('filter').never();
            stubs.highlighterMock.expects('removeHighlights').never();
            sandbox.stub(Array, 'isArray').returns(false);

            annotator.removeRangyHighlight({ id: 1 });
        });

        it('should call removeHighlights on any matching highlight ids', () => {
            annotator.highlighter = {
                highlights: {
                    filter: () => {},
                    ids: [1, 2, 3, 4]
                },
                filter: () => {},
                removeHighlights: () => {}
            };
            stubs.highlighterMock = sandbox.mock(annotator.highlighter);
            stubs.highlighterMock.expects('removeHighlights').withArgs(annotator.highlighter.highlights.ids[0]);

            stubs.highlightMock = sandbox.mock(annotator.highlighter.highlights);
            stubs.highlightMock.expects('filter').returns(annotator.highlighter.highlights.ids[0]);

            sandbox.stub(Array, 'isArray').returns(true);

            annotator.removeRangyHighlight({ id: 1 });
        });
    });

    describe('drawingSelectionHandler()', () => {
        it('should use the controller to select with the event', () => {
            const drawController = {
                handleSelection: sandbox.stub(),
                removeSelection: sandbox.stub()
            };
            annotator.modeControllers = {
                [TYPES.draw]: drawController
            };

            const evt = 'event';
            annotator.drawingSelectionHandler(evt);
            expect(drawController.handleSelection).to.be.calledWith(evt);
        });

        it('should not error when no modeButtons exist for draw', () => {
            annotator.modeButtons = {};
            expect(() => annotator.drawingSelectionHandler('irrelevant')).to.not.throw();
        });
    });

    describe('handleAnnotationThreadEvents()', () => {
        beforeEach(() => {
            stubs.handleFunc = Annotator.prototype.handleAnnotationThreadEvents;
            Object.defineProperty(Annotator.prototype, 'handleAnnotationThreadEvents', { value: sandbox.stub() });

            stubs.getThread = sandbox.stub(annotator, 'getThreadByID');
            stubs.show = sandbox.stub(annotator, 'showHighlightsOnPage');
        });

        afterEach(() => {
            Object.defineProperty(Annotator.prototype, 'handleAnnotationThreadEvents', { value: stubs.handleFunc });
        });

        it('should do nothing if invalid params are specified', () => {
            annotator.handleAnnotationThreadEvents('no data');
            annotator.handleAnnotationThreadEvents({ data: 'no threadID'});
            expect(stubs.getThread).to.not.be.called;

            annotator.handleAnnotationThreadEvents({ data: { threadID: 1 }});
            expect(Annotator.prototype.handleAnnotationThreadEvents).to.not.be.called;
        });

        it('should re-render page highlights on threadDelete', () => {
            stubs.getThread.returns(stubs.thread);
            const data = {
                event: THREAD_EVENT.threadDelete,
                data: { threadID: 1 }
            };
            annotator.handleAnnotationThreadEvents(data);
            expect(stubs.show).to.be.calledWith(stubs.thread.location.page);
        });
    });
});
