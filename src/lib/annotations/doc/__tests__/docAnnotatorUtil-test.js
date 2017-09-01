/* eslint-disable no-unused-expressions */
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import {
    SELECTOR_ANNOTATION_DIALOG,
    SELECTOR_ANNOTATION_CONTAINER,
    CLASS_ANNOTATION_DIALOG,
    DATA_TYPE_ANNOTATION_DIALOG
} from '../../annotationConstants';
import * as annotatorUtil from '../../annotatorUtil';

const sandbox = sinon.sandbox.create();
let stubs = {};

describe('lib/annotations/doc/docAnnotatorUtil', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/docAnnotatorUtil-test.html');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('isPresentation()', () => {
        it('should return false if annotatedElement is a document', () => {
            const docEl = document.querySelector('.annotatedElement');
            const result = docAnnotatorUtil.isPresentation(docEl);
            expect(result).to.be.false;
        });

        it('should return true if annotatedElement is a presentation', () => {
            const docEl = document.querySelector('.annotatedElement');
            docEl.classList.add('bp-doc-presentation');
            const result = docAnnotatorUtil.isPresentation(docEl);
            expect(result).to.be.true;
        });
    });

    describe('isInDialog()', () => {
        it('should return false if no dialog element exists', () => {
            const result = annotatorUtil.isInDialog({ clientX: 8, clientY: 8 });
            expect(result).to.be.false;
        });

        it('should return true if the event is in the given dialog', () => {
            const dialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            const result = annotatorUtil.isInDialog({ clientX: 8, clientY: 8 }, dialogEl);
            expect(result).to.be.true;
        });

        it('should return false if the event is in the given dialog', () => {
            const dialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            const result = annotatorUtil.isInDialog({ clientX: 100, clientY: 100 }, dialogEl);
            expect(result).to.be.false;
        });
    });

    describe('hasActiveDialog()', () => {
        it('should return false if no annotation dialog is open', () => {
            const currDialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            currDialogEl.classList.add('bp-is-hidden');
            const result = docAnnotatorUtil.hasActiveDialog(document);
            expect(result).to.be.false;
        });

        it('should return true if an annotion dialog is open', () => {
            const docEl = document.querySelector('.annotatedElement');
            const currDialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            currDialogEl.classList.add('bp-is-hidden');

            const openDialogEl = document.createElement('div');
            openDialogEl.classList.add(CLASS_ANNOTATION_DIALOG);
            docEl.appendChild(openDialogEl);

            const result = docAnnotatorUtil.hasActiveDialog(document);
            expect(result).to.be.true;
        });
    });

    describe('isPointInPolyOpt()', () => {
        it('should return true if point is inside polygon', () => {
            const polygon = [[0, 0], [100, 0], [100, 100], [0, 100]];
            expect(docAnnotatorUtil.isPointInPolyOpt(polygon, 50, 50)).to.be.true;
        });

        it('should return false if point is outside polygon', () => {
            const polygon = [[0, 0], [100, 0], [100, 100], [0, 100]];
            expect(docAnnotatorUtil.isPointInPolyOpt(polygon, 120, 50)).to.be.false;
        });
    });

    describe('isSelectionPresent()', () => {
        it('should return true if there is a non-empty selection on the page', () => {
            const barEl = document.querySelector('.bar');
            const range = document.createRange();
            range.selectNode(barEl.childNodes[0]);
            const selection = window.getSelection();
            selection.addRange(range);
            expect(docAnnotatorUtil.isSelectionPresent()).to.be.true;
        });

        it('should return false if there is no non-empty selection on the page', () => {
            expect(docAnnotatorUtil.isSelectionPresent()).to.be.false;
        });
    });

    describe('convertPDFSpaceToDOMSpace()', () => {
        it('should convert coordinates from PDF space to DOM space', () => {
            const coordinates = [300, 300];

            // 300 * 4/3 * 0.5, 1000 - 300 * 4/3 * 0.5
            const expected = [200, 800];
            expect(docAnnotatorUtil.convertPDFSpaceToDOMSpace(coordinates, 1000, 0.5)).to.deep.equals(expected);
        });
    });

    describe('convertDOMSpaceToPDFSpace()', () => {
        it('should convert coordinates from DOM space to PDF space', () => {
            const coordinates = [400, 400];

            // 400 * 3/4 / 0.5 to fixed 4, (1000 - 400) * 3/4 / 0.5 to fixed 4
            const expected = [Number(600).toFixed(4), Number(900).toFixed(4)];
            expect(docAnnotatorUtil.convertDOMSpaceToPDFSpace(coordinates, 1000, 0.5)).to.deep.equals(expected);
        });
    });

    describe('getBrowserCoordinatesFromLocation()', () => {
        it('should return DOM coordinates from an annotation location object', () => {
            const location = {
                x: 300,
                y: 300,
                dimensions: {
                    x: 600,
                    y: 1000
                }
            };

            const annotatedEl = document.querySelector('.annotatedElement');
            annotatedEl.style.height = '1030px';
            annotatedEl.style.width = '600px';

            expect(docAnnotatorUtil.getBrowserCoordinatesFromLocation(location, annotatedEl)).to.deep.equals([400, 600]);
        });
    });

    describe('getLowerRightCornerOfLastQuadPoint()', () => {
        const quadPoints = [[0, 10, 10, 10, 10, 20, 0, 20], [0, 0, 10, 0, 10, 10, 0, 10]];

        expect(docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint(quadPoints)).to.deep.equals([10, 0]);
    });

    describe('getTopRightCornerOfLastQuadPoint()', () => {
        const quadPoints = [[0, 10, 10, 10, 10, 20, 0, 20], [0, 0, 10, 0, 10, 10, 0, 10]];

        expect(docAnnotatorUtil.getTopRightCornerOfLastQuadPoint(quadPoints)).to.deep.equals([0, 0]);
    });

    describe('isValidSelection', () => {
        it('should return false if there are no ranges present in the selection', () => {
            const selection = {
                rangeCount: 0,
                isCollapsed: false,
                toString: () => 'I am valid!'
            };
            expect(docAnnotatorUtil.isValidSelection(selection)).to.be.false;
        });

        it('should return false if the selection isn\'t collapsed', () => {
            const selection = {
                rangeCount: 1,
                isCollapsed: true,
                toString: () => 'I am valid!'
            };
            expect(docAnnotatorUtil.isValidSelection(selection)).to.be.false;
        });

        it('should return false if the selection is empty', () => {
            const selection = {
                rangeCount: 1,
                isCollapsed: false,
                toString: () => ''
            };
            expect(docAnnotatorUtil.isValidSelection(selection)).to.be.false;
        });

        it('should return true if the selection is valid', () => {
            const selection = {
                rangeCount: 1,
                isCollapsed: false,
                toString: () => 'I am valid!'
            };
            expect(docAnnotatorUtil.isValidSelection(selection)).to.be.true;
        });
    });

    describe('scaleCanvas()', () => {
        const width = 100;
        const height = 200;

        // PAGE_PADDING_TOP + PAGE_PADDING_BOTTOM
        const pagePadding = 30;

        beforeEach(() => {
            stubs.annotationLayer = document.createElement('canvas');
            stubs.context = {
                scale: sandbox.stub()
            };
            sandbox.stub(stubs.annotationLayer, 'getContext').returns(stubs.context);

            stubs.pageEl = {
                getBoundingClientRect: sandbox.stub().returns({
                    width,
                    height
                })
            };

            stubs.canvasHeight = height - pagePadding;
        });

        it('should adjust canvas height and width and return the scaled canvas', () => {
            const scaledCanvas = docAnnotatorUtil.scaleCanvas(stubs.pageEl, stubs.annotationLayer);
            expect(scaledCanvas.width).equals(width);
            expect(scaledCanvas.height).equals(stubs.canvasHeight);
            expect(scaledCanvas.style.width).not.equals(`${width}px`);
            expect(scaledCanvas.style.height).not.equals(`${height}px`);
        });

        it('should add style height & width if device pixel ratio is not 1', () => {
            const pxRatio = 2;
            window.devicePixelRatio = pxRatio;

            const scaledCanvas = docAnnotatorUtil.scaleCanvas(stubs.pageEl, stubs.annotationLayer);

            expect(scaledCanvas.width).equals(width * pxRatio);
            expect(scaledCanvas.height).equals(stubs.canvasHeight * pxRatio);
            expect(scaledCanvas.style.width).equals(`${width}px`);
            expect(scaledCanvas.style.height).equals(`${stubs.canvasHeight}px`);
            expect(stubs.annotationLayer.getContext).to.be.called;
        });
    });

    describe('getContext()', () => {
        beforeEach(() => {
            stubs.annotationLayer = {
                width: 0,
                height: 0,
                getContext: sandbox.stub().returns('2d context'),
                classList: {
                    add: sandbox.stub()
                },
                style: {}
            };

            stubs.pageEl = {
                querySelector: sandbox.stub(),
                getBoundingClientRect: sandbox.stub(),
                insertBefore: sandbox.stub()
            };

            sandbox.stub(docAnnotatorUtil, 'scaleCanvas').returns(stubs.annotationLayer);
        });

        it('should return null if there is no pageEl', () => {
            const result = docAnnotatorUtil.getContext(null, 'random-class-name', 0, 0);
            expect(result).to.equal(null);
        });

        it('should not insert into the pageEl if the annotationLayerEl already exists', () => {
            stubs.pageEl.querySelector.returns(stubs.annotationLayer);
            docAnnotatorUtil.getContext(stubs.pageEl, 'random-class-name');
            expect(stubs.annotationLayer.getContext).to.be.called;
            expect(stubs.pageEl.insertBefore).to.not.be.called;
        });

        it('should insert into the pageEl if the annotationLayerEl does not exist', () => {
            stubs.annotationLayer.getContext.returns({
                scale: sandbox.stub()
            });
            stubs.pageEl.getBoundingClientRect.returns({ width: 0, height: 0 });
            const docStub = sandbox.stub(document, 'createElement').returns(stubs.annotationLayer);

            docAnnotatorUtil.getContext(stubs.pageEl, 'random-class-name', 0, 0);
            expect(docStub).to.be.called;
            expect(stubs.annotationLayer.getContext).to.be.called;
            expect(stubs.annotationLayer.classList.add).to.be.called;
            expect(stubs.pageEl.insertBefore).to.be.called;
        });
    });

    describe('getPageEl()', () => {
        it('should return the result of querySelector', () => {
            const page = 2;
            const docEl = document.querySelector('.annotatedElement');
            const truePageEl = document.querySelector(`.page[data-page-number="${page}"]`);
            docEl.appendChild(truePageEl);

            const pageEl = docAnnotatorUtil.getPageEl(docEl, page);
            expect(pageEl).equals(truePageEl);
        });
    });

    describe('isDialogDataType()', () => {
        it('should return true if the mouse event occured in a highlight dialog', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns(DATA_TYPE_ANNOTATION_DIALOG);
            expect(docAnnotatorUtil.isDialogDataType({})).to.be.true;
        });

        it('should return false if the mouse event occured outside a highlight dialog', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('something');
            expect(docAnnotatorUtil.isDialogDataType({})).to.be.false;
        });
    });
});
