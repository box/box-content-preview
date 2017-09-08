import * as annotatorUtil from '../../annotatorUtil';
import DocDrawingDialog from '../DocDrawingDialog';

let docDrawingDialog;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocDrawingDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocDrawingDialog-test.html');
        docDrawingDialog = new DocDrawingDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        docDrawingDialog = null;
        stubs = null;
    });

    describe('isVisible()', () => {
        it('should return true if the dialog is visible', () => {
            docDrawingDialog.visible = true;
            expect(docDrawingDialog.isVisible()).to.be.truthy;
        });

        it('should return false if the dialog is not visible', () => {
            docDrawingDialog.visible = false;
            expect(docDrawingDialog.isVisible()).to.be.falsy;
        });
    });

    describe('postDrawing()', () => {
        it('should emit annotation create to indicate that the save button was pressed', () => {
            const event = {
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub()
            }
            sandbox.stub(docDrawingDialog, 'emit');

            docDrawingDialog.postDrawing(event);
            expect(docDrawingDialog.emit).to.be.calledWith('annotationcreate');
            expect(event.stopPropagation).to.be.called;
            expect(event.preventDefault).to.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind listeners to a commit button element', () => {
            docDrawingDialog.hasTouch = true;
            docDrawingDialog.commitButtonEl = {
                addEventListener: sandbox.stub()
            };

            docDrawingDialog.bindDOMListeners();
            expect(docDrawingDialog.commitButtonEl.addEventListener).to.be.calledWith(
                'click',
                docDrawingDialog.postDrawing
            );
            expect(docDrawingDialog.commitButtonEl.addEventListener).to.be.calledWith(
                'touchend',
                docDrawingDialog.postDrawing
            );
        });

        it('should bind listeners to a delete button element', () => {
            docDrawingDialog.hasTouch = true;
            docDrawingDialog.deleteButtonEl = {
                addEventListener: sandbox.stub()
            };

            docDrawingDialog.bindDOMListeners();
            expect(docDrawingDialog.deleteButtonEl.addEventListener).to.be.calledWith(
                'click',
                docDrawingDialog.deleteAnnotation
            );
            expect(docDrawingDialog.deleteButtonEl.addEventListener).to.be.calledWith(
                'touchend',
                docDrawingDialog.deleteAnnotation
            );
        })
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind listeners on a commit button element', () => {
            docDrawingDialog.hasTouch = true;
            docDrawingDialog.commitButtonEl = {
                removeEventListener: sandbox.stub()
            };

            docDrawingDialog.unbindDOMListeners();
            expect(docDrawingDialog.commitButtonEl.removeEventListener).to.be.calledWith(
                'click',
                docDrawingDialog.postDrawing
            );
            expect(docDrawingDialog.commitButtonEl.removeEventListener).to.be.calledWith(
                'touchend',
                docDrawingDialog.postDrawing
            );
        });

        it('should unbind listeners on a delete button element', () => {
            docDrawingDialog.hasTouch = true;
            docDrawingDialog.deleteButtonEl = {
                removeEventListener: sandbox.stub()
            };

            docDrawingDialog.unbindDOMListeners();
            expect(docDrawingDialog.deleteButtonEl.removeEventListener).to.be.calledWith(
                'click',
                docDrawingDialog.deleteAnnotation
            );
            expect(docDrawingDialog.deleteButtonEl.removeEventListener).to.be.calledWith(
                'touchend',
                docDrawingDialog.deleteAnnotation
            );
        })
    });

    describe('setup()', () => {
        let drawingDialogEl;

        beforeEach(() => {
            drawingDialogEl = document.querySelector('.bp-annotation-drawing-dialog');

            sandbox.stub(docDrawingDialog, 'generateDialogEl').returns(drawingDialogEl);
            sandbox.stub(docDrawingDialog, 'bindDOMListeners');
            sandbox.stub(docDrawingDialog, 'assignDrawingLabel');
        });

        it('should setup the dialog element without a commit button when given an annotation', () => {
            const annotation = {
                user: {
                    name: 'Yao Ming'
                }
            };

            expect(docDrawingDialog.element).to.be.undefined;
            docDrawingDialog.setup([annotation]);
            expect(docDrawingDialog.generateDialogEl).to.be.called;
            expect(docDrawingDialog.bindDOMListeners).to.be.called;
            expect(docDrawingDialog.assignDrawingLabel).to.be.called;
            expect(docDrawingDialog.element.contains(docDrawingDialog.drawingDialogEl));
            expect(docDrawingDialog.commitButtonEl).to.be.null;
        });

        it('should setup the dialog element with a commit button when not given an annotation', () => {
            docDrawingDialog.setup([]);
            expect(docDrawingDialog.generateDialogEl).to.be.called;
            expect(docDrawingDialog.bindDOMListeners).to.be.called;
            expect(docDrawingDialog.assignDrawingLabel).to.not.be.called;
            expect(docDrawingDialog.element.contains(docDrawingDialog.drawingDialogEl));
            expect(docDrawingDialog.commitButtonEl).to.not.be.undefined;
            expect(docDrawingDialog.element.contains(docDrawingDialog.commitButtonEl));
        });
    });

    describe('position()', () => {
        it('should insert the element into the page element and set the position', () => {
            const rect = {
                width: 1
            };
            const pageEl = {
                contains: sandbox.stub().returns(false),
                appendChild: sandbox.stub()
            };

            docDrawingDialog.location = {
                page: 1
            };
            docDrawingDialog.annotatedElement = {
                querySelector: sandbox.stub().returns(pageEl)
            };
            docDrawingDialog.element = {
                style: {
                    left: 0,
                    top: 0
                },
                getBoundingClientRect: sandbox.stub().returns(rect)
            }

            docDrawingDialog.position(5, 10);
            expect(docDrawingDialog.element.getBoundingClientRect).to.be.called;
            expect(pageEl.contains).to.be.called;
            expect(pageEl.appendChild).to.be.calledWith(docDrawingDialog.element);
            expect(docDrawingDialog.annotatedElement.querySelector).to.be.called;
            expect(docDrawingDialog.element.style.left).to.equal(`4px`, `10px`);
        });
    });

    describe('hide()', () => {
        it('should hide the element with css', () => {
            const element = 'e';

            sandbox.stub(annotatorUtil, 'hideElement');
            docDrawingDialog.element = element;
            expect(docDrawingDialog.visible).to.be.truthy;

            docDrawingDialog.hide();
            expect(annotatorUtil.hideElement).to.be.calledWith(element);
            expect(docDrawingDialog.visible).to.be.falsy;
        });
    });

    describe('show()', () => {
        it('should show the element with css', () => {
            const element = 'e';

            sandbox.stub(annotatorUtil, 'showElement');
            docDrawingDialog.element = element;
            expect(docDrawingDialog.visible).to.be.falsy;

            docDrawingDialog.show();
            expect(annotatorUtil.showElement).to.be.calledWith(element);
            expect(docDrawingDialog.visible).to.be.truthy;
        });
    });

    describe('generateDialogEl()', () => {
        let annotation;

        beforeEach(() => {
            annotation = {
                user: {
                    name: 'Yao Ming'
                },
                permissions: {
                    can_delete: true
                }
            }
        });

        it('should generate the correctly formatted label dialog element', () => {
            annotation.permissions.can_delete = false;

            const returnValue = docDrawingDialog.generateDialogEl([annotation]);
            expect(returnValue.classList.contains('bp-annotation-drawing-dialog')).to.be.truthy;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-delete')).to.be.null;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-add')).to.be.null;
            expect(returnValue.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });

        it('should generate without a save button', () => {
            const returnValue = docDrawingDialog.generateDialogEl([annotation]);
            expect(returnValue.classList.contains('bp-annotation-drawing-dialog')).to.be.truthy;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-delete')).to.not.be.null;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-add')).to.be.null;
            expect(returnValue.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });

        it('should generate a save and delete button', () => {
            const returnValue = docDrawingDialog.generateDialogEl([]);
            expect(returnValue.classList.contains('bp-annotation-drawing-dialog')).to.be.truthy;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-delete')).to.not.be.null;
            expect(returnValue.querySelector('.bp-btn-annotate-draw-add')).to.not.be.null;
            expect(returnValue.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });
    });

    describe('assignDrawingLabel()', () => {
        it('should assign a name to a drawing label', () => {
            const drawingLabelEl = {};
            const notYaoMing = 'not yao ming';
            docDrawingDialog.drawingDialogEl = {
                querySelector: sandbox.stub().returns(drawingLabelEl)
            };
            sandbox.stub(annotatorUtil, 'replacePlaceholders').returns(notYaoMing);
            sandbox.stub(annotatorUtil, 'showElement');

            docDrawingDialog.assignDrawingLabel('non empty');
            expect(drawingLabelEl.textContent).to.equal(notYaoMing);
            expect(docDrawingDialog.drawingDialogEl.querySelector).to.be.called;
            expect(annotatorUtil.replacePlaceholders).to.be.called;
            expect(annotatorUtil.showElement).to.be.called;
        });

        it('should do nothing when given an invalid annotation or does not have a dialog', () => {
            expect(docDrawingDialog.assignDrawingLabel, 'not empty').to.not.throw();

            docDrawingDialog.drawingDialogEl = 'not empty';
            expect(docDrawingDialog.assignDrawingLabel, undefined).to.not.throw();
            expect(docDrawingDialog.assignDrawingLabel, null).to.not.throw();
        });
    });
});
