/* eslint-disable no-unused-expressions */
import {
    isPresentation,
    isInDialog,
    hasActiveDialog,
    fitDialogHeightInPage,
    isPointInPolyOpt,
    isSelectionPresent,
    convertPDFSpaceToDOMSpace,
    convertDOMSpaceToPDFSpace,
    getBrowserCoordinatesFromLocation,
    getLowerRightCornerOfLastQuadPoint,
    getContext,
    getPageEl
} from '../docAnnotatorUtil';
import {
    SELECTOR_ANNOTATION_DIALOG,
    SELECTOR_ANNOTATION_CONTAINER,
    CLASS_ANNOTATION_DIALOG
} from '../../annotationConstants';

const sandbox = sinon.sandbox.create();

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
    });

    describe('isPresentation()', () => {
        it('should return false if annotatedElement is a document', () => {
            const docEl = document.querySelector('.annotatedElement');
            const result = isPresentation(docEl);
            expect(result).to.be.false;
        });

        it('should return true if annotatedElement is a presentation', () => {
            const docEl = document.querySelector('.annotatedElement');
            docEl.classList.add('bp-doc-presentation');
            const result = isPresentation(docEl);
            expect(result).to.be.true;
        });
    });

    describe('isInDialog()', () => {
        it('should return false if no dialog element exists', () => {
            const result = isInDialog({ clientX: 8, clientY: 8 });
            expect(result).to.be.false;
        });

        it('should return true if the event is in the given dialog', () => {
            const dialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            const result = isInDialog({ clientX: 8, clientY: 8 }, dialogEl);
            expect(result).to.be.true;
        });

        it('should return false if the event is in the given dialog', () => {
            const dialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            const result = isInDialog({ clientX: 100, clientY: 100 }, dialogEl);
            expect(result).to.be.false;
        });
    });

    describe('hasActiveDialog()', () => {
        it('should return false if no annotation dialog is open', () => {
            const currDialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            currDialogEl.classList.add('bp-is-hidden');
            const result = hasActiveDialog(document);
            expect(result).to.be.false;
        });

        it('should return true if an annotion dialog is open', () => {
            const docEl = document.querySelector('.annotatedElement');
            const currDialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            currDialogEl.classList.add('bp-is-hidden');

            const openDialogEl = document.createElement('div');
            openDialogEl.classList.add(CLASS_ANNOTATION_DIALOG);
            docEl.appendChild(openDialogEl);

            const result = hasActiveDialog(document);
            expect(result).to.be.true;
        });
    });

    describe('fitDialogHeightInPage()', () => {
        it('should allow scrolling on annotations dialog if file is a powerpoint', () => {
            const docEl = document.querySelector('.annotatedElement');
            docEl.classList.add('bp-doc-presentation');
            docEl.style.height = 100;

            const dialogEl = document.querySelector(SELECTOR_ANNOTATION_DIALOG);
            const pageHeight = 20;
            const yPos = 5;

            fitDialogHeightInPage(docEl, dialogEl, pageHeight, yPos);

            const annotationsEl = dialogEl.querySelector(SELECTOR_ANNOTATION_CONTAINER);
            expect(annotationsEl.style.maxHeight).to.not.be.undefined;
        });
    });

    describe('isPointInPolyOpt()', () => {
        it('should return true if point is inside polygon', () => {
            const polygon = [[0, 0], [100, 0], [100, 100], [0, 100]];
            assert.ok(isPointInPolyOpt(polygon, 50, 50));
        });

        it('should return false if point is outside polygon', () => {
            const polygon = [[0, 0], [100, 0], [100, 100], [0, 100]];
            assert.ok(!isPointInPolyOpt(polygon, 120, 50));
        });
    });

    describe('isSelectionPresent()', () => {
        it('should return true if there is a non-empty selection on the page', () => {
            const barEl = document.querySelector('.bar');
            const range = document.createRange();
            range.selectNode(barEl.childNodes[0]);
            const selection = window.getSelection();
            selection.addRange(range);
            assert.ok(isSelectionPresent());
        });

        it('should return false if there is no non-empty selection on the page', () => {
            assert.ok(!isSelectionPresent());
        });
    });

    describe('convertPDFSpaceToDOMSpace()', () => {
        it('should convert coordinates from PDF space to DOM space', () => {
            const coordinates = [300, 300];

            // 300 * 4/3 * 0.5, 1000 - 300 * 4/3 * 0.5
            const expected = [200, 800];
            assert.equal(convertPDFSpaceToDOMSpace(coordinates, 1000, 0.5).toString(), expected.toString());
        });
    });

    describe('convertDOMSpaceToPDFSpace()', () => {
        it('should convert coordinates from DOM space to PDF space', () => {
            const coordinates = [400, 400];

            // 400 * 3/4 / 0.5 to fixed 4, (1000 - 400) * 3/4 / 0.5 to fixed 4
            const expected = [Number(600).toFixed(4), Number(900).toFixed(4)];
            assert.equal(convertDOMSpaceToPDFSpace(coordinates, 1000, 0.5).toString(), expected.toString());
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

            assert.equal(getBrowserCoordinatesFromLocation(location, annotatedEl).toString(), [400, 600].toString());
        });
    });

    describe('getLowerRightCornerOfLastQuadPoint()', () => {
        const quadPoints = [[0, 10, 10, 10, 10, 20, 0, 20], [0, 0, 10, 0, 10, 10, 0, 10]];

        assert.equal(getLowerRightCornerOfLastQuadPoint(quadPoints).toString(), [10, 0].toString());
    });


    describe('getContext()', () => {
        it('should return null if there is no pageEl', () => {
            const result = getContext(null, 'random-class-name', 0, 0);
            expect(result).to.equal(null);
        });

        it('should not insert into the pageEl if the annotationLayerEl already exists', () => {
            const annotationLayer = {
                width: 0,
                height: 0,
                getContext: sandbox.stub().returns('2d context')
            };
            const pageEl = {
                querySelector: sandbox.stub().returns(annotationLayer),
                getBoundingClientRect: sandbox.stub(),
                insertBefore: sandbox.stub()
            };

            getContext(pageEl, 'random-class-name');
            expect(annotationLayer.getContext).to.be.called;
            expect(pageEl.insertBefore).to.not.be.called;
        });

        it('should insert into the pageEl if the annotationLayerEl does not exist', () => {
            const annotationLayer = {
                width: 0,
                height: 0,
                getContext: sandbox.stub().returns('2d context'),
                classList: {
                    add: sandbox.stub()
                }
            };
            const pageEl = {
                querySelector: sandbox.stub().returns(undefined),
                getBoundingClientRect: sandbox.stub().returns({ width: 0, height: 0 }),
                insertBefore: sandbox.stub()
            };
            const docStub = sandbox.stub(document, 'createElement').returns(annotationLayer);

            getContext(pageEl, 'random-class-name', 0, 0);
            expect(docStub).to.be.called;
            expect(annotationLayer.getContext).to.be.called;
            expect(annotationLayer.classList.add).to.be.called;
            expect(pageEl.insertBefore).to.be.called;
        });
    });

    describe('getPageEl()', () => {
        it('should return the result of querySelector', () => {
            const page = 2;
            const docEl = document.querySelector('.annotatedElement');
            const truePageEl = document.querySelector(`.page[data-page-number="${page}"]`);
            docEl.appendChild(truePageEl);

            const pageEl = getPageEl(docEl, page);
            assert.equal(pageEl, truePageEl);
        });
    });
});
