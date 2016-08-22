/* eslint-disable no-unused-expressions */
import Annotator from '../../annotator';
import DocAnnotator from '../../doc/doc-annotator';
import DocHighlightThread from '../../doc/doc-highlight-thread';
import DocPointThread from '../../doc/doc-point-thread';
import rangy from 'rangy';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';

let annotator;
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
        it('shouldn\'t bind DOM listeners if user cannot annotate', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'addEventListener');
            annotator._annotationService.canAnnotate = false;

            annotator.bindDOMListeners();

            expect(element.addEventListener).to.not.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('mousemove', sinon.match.func);
            expect(element.addEventListener).to.not.have.been.calledWith('mouseup', sinon.match.func);
        });

        it('should bind DOM listeners if user can annotate', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'addEventListener');
            annotator._annotationService.canAnnotate = true;

            annotator.bindDOMListeners();

            expect(element.addEventListener).to.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('mousemove', sinon.match.func);
            expect(element.addEventListener).to.have.been.calledWith('mouseup', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('shouldn\'t unbind DOM listeners if user cannot annotate', () => {
            const element = annotator._annotatedElement;
            sandbox.stub(element, 'removeEventListener');
            annotator._annotationService.canAnnotate = false;

            annotator.unbindDOMListeners();

            expect(element.removeEventListener).to.not.have.been.calledWith('mousedown', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('contextmenu', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('mousemove', sinon.match.func);
            expect(element.removeEventListener).to.not.have.been.calledWith('mouseup', sinon.match.func);
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
});
