import * as annotatorUtil from '../../annotatorUtil';
import * as constants from '../../annotationConstants';
import DocDrawingDialog from '../DocDrawingDialog';

let dialog;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocDrawingDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocDrawingDialog-test.html');
        dialog = new DocDrawingDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        dialog.localized = {
            drawSave: 'save',
            whoDrew: 'someone drew'
        };
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        dialog = null;
        stubs = null;
    });

    describe('isVisible()', () => {
        it('should return true if the dialog is visible', () => {
            dialog.visible = true;
            expect(dialog.isVisible()).to.be.truthy;
        });

        it('should return false if the dialog is not visible', () => {
            dialog.visible = false;
            expect(dialog.isVisible()).to.be.falsy;
        });
    });

    describe('postDrawing()', () => {
        it('should emit annotation create to indicate that the save button was pressed', () => {
            const event = {
                stopPropagation: sandbox.stub(),
                preventDefault: sandbox.stub()
            }
            sandbox.stub(dialog, 'emit');

            dialog.postDrawing(event);
            expect(dialog.emit).to.be.calledWith('annotationcreate');
            expect(event.stopPropagation).to.be.called;
            expect(event.preventDefault).to.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind listeners to a commit button element', () => {
            dialog.hasTouch = true;
            dialog.commitButtonEl = {
                addEventListener: sandbox.stub()
            };

            dialog.bindDOMListeners();
            expect(dialog.commitButtonEl.addEventListener).to.be.calledWith(
                'click',
                dialog.postDrawing
            );
            expect(dialog.commitButtonEl.addEventListener).to.be.calledWith(
                'touchend',
                dialog.postDrawing
            );
        });

        it('should bind listeners to a delete button element', () => {
            dialog.hasTouch = true;
            dialog.deleteButtonEl = {
                addEventListener: sandbox.stub()
            };

            dialog.bindDOMListeners();
            expect(dialog.deleteButtonEl.addEventListener).to.be.calledWith(
                'click',
                dialog.deleteAnnotation
            );
            expect(dialog.deleteButtonEl.addEventListener).to.be.calledWith(
                'touchend',
                dialog.deleteAnnotation
            );
        })
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind listeners on a commit button element', () => {
            dialog.hasTouch = true;
            dialog.commitButtonEl = {
                removeEventListener: sandbox.stub()
            };

            dialog.unbindDOMListeners();
            expect(dialog.commitButtonEl.removeEventListener).to.be.calledWith(
                'click',
                dialog.postDrawing
            );
            expect(dialog.commitButtonEl.removeEventListener).to.be.calledWith(
                'touchend',
                dialog.postDrawing
            );
        });

        it('should unbind listeners on a delete button element', () => {
            dialog.hasTouch = true;
            dialog.deleteButtonEl = {
                removeEventListener: sandbox.stub()
            };

            dialog.unbindDOMListeners();
            expect(dialog.deleteButtonEl.removeEventListener).to.be.calledWith(
                'click',
                dialog.deleteAnnotation
            );
            expect(dialog.deleteButtonEl.removeEventListener).to.be.calledWith(
                'touchend',
                dialog.deleteAnnotation
            );
        })
    });

    describe('setup()', () => {
        let drawingDialogEl;

        beforeEach(() => {
            drawingDialogEl = document.querySelector('.bp-annotation-drawing-dialog');

            sandbox.stub(dialog, 'generateDialogEl').returns(drawingDialogEl);
            sandbox.stub(dialog, 'bindDOMListeners');
            sandbox.stub(dialog, 'assignDrawingLabel');
        });

        it('should setup the dialog element without a commit button when given an annotation', () => {
            const annotation = {
                user: {
                    name: 'Yao Ming'
                }
            };

            expect(dialog.element).to.be.undefined;
            dialog.setup([annotation]);
            expect(dialog.generateDialogEl).to.be.called;
            expect(dialog.bindDOMListeners).to.be.called;
            expect(dialog.assignDrawingLabel).to.be.called;
            expect(dialog.element.contains(dialog.drawingDialogEl));
            expect(dialog.commitButtonEl).to.be.null;
        });

        it('should setup the dialog element with a commit button when not given an annotation', () => {
            dialog.setup([]);
            expect(dialog.generateDialogEl).to.be.called;
            expect(dialog.bindDOMListeners).to.be.called;
            expect(dialog.assignDrawingLabel).to.not.be.called;
            expect(dialog.element.contains(dialog.drawingDialogEl));
            expect(dialog.commitButtonEl).to.not.be.undefined;
            expect(dialog.element.contains(dialog.commitButtonEl));
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

            dialog.location = {
                page: 1
            };
            dialog.annotatedElement = {
                querySelector: sandbox.stub().returns(pageEl)
            };
            dialog.element = {
                style: {
                    left: 0,
                    top: 0
                },
                getBoundingClientRect: sandbox.stub().returns(rect)
            }

            dialog.position(5, 10);
            expect(dialog.element.getBoundingClientRect).to.be.called;
            expect(pageEl.contains).to.be.called;
            expect(pageEl.appendChild).to.be.calledWith(dialog.element);
            expect(dialog.annotatedElement.querySelector).to.be.called;
            expect(dialog.element.style.left).to.equal(`4px`, `10px`);
        });
    });

    describe('hide()', () => {
        it('should hide the element with css', () => {
            const element = 'e';

            sandbox.stub(annotatorUtil, 'hideElement');
            dialog.element = element;
            expect(dialog.visible).to.be.truthy;

            dialog.hide();
            expect(annotatorUtil.hideElement).to.be.calledWith(element);
            expect(dialog.visible).to.be.falsy;
        });
    });

    describe('show()', () => {
        it('should show the element with css', () => {
            const element = 'e';

            sandbox.stub(annotatorUtil, 'showElement');
            dialog.element = element;
            expect(dialog.visible).to.be.falsy;

            dialog.show();
            expect(annotatorUtil.showElement).to.be.calledWith(element);
            expect(dialog.visible).to.be.truthy;
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

            const dialogEl = dialog.generateDialogEl([annotation]);
            expect(dialogEl.classList.contains(constants.CLASS_ANNOTATION_DRAWING_DIALOG)).to.be.truthy;
            expect(dialogEl.querySelector(`.${constants.CLASS_DELETE_DRAWING_BTN}`)).to.be.null;
            expect(dialogEl.querySelector(`.${constants.CLASS_ADD_DRAWING_BTN}`)).to.be.null;
            expect(dialogEl.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });

        it('should generate without a save button', () => {
            const dialogEl = dialog.generateDialogEl([annotation]);
            expect(dialogEl.classList.contains(constants.CLASS_ANNOTATION_DRAWING_DIALOG)).to.be.truthy;
            expect(dialogEl.querySelector(`.${constants.CLASS_DELETE_DRAWING_BTN}`)).to.not.be.null;
            expect(dialogEl.querySelector(`.${constants.CLASS_ADD_DRAWING_BTN}`)).to.be.null;
            expect(dialogEl.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });

        it('should generate a save and delete button', () => {
            const dialogEl = dialog.generateDialogEl([]);
            expect(dialogEl.classList.contains(constants.CLASS_ANNOTATION_DRAWING_DIALOG)).to.be.truthy;
            expect(dialogEl.querySelector(`.${constants.CLASS_DELETE_DRAWING_BTN}`)).to.not.be.null;
            expect(dialogEl.querySelector(`.${constants.CLASS_ADD_DRAWING_BTN}`)).to.not.be.null;
            expect(dialogEl.querySelector('.bp-annotation-drawing-label')).to.not.be.null;
        });
    });

    describe('assignDrawingLabel()', () => {
        it('should assign a name to a drawing label', () => {
            const drawingLabelEl = {};
            const notYaoMing = 'not yao ming';
            dialog.drawingDialogEl = {
                querySelector: sandbox.stub().returns(drawingLabelEl)
            };
            sandbox.stub(annotatorUtil, 'replacePlaceholders').returns(notYaoMing);
            sandbox.stub(annotatorUtil, 'showElement');

            dialog.assignDrawingLabel('non empty');
            expect(drawingLabelEl.textContent).to.equal(notYaoMing);
            expect(dialog.drawingDialogEl.querySelector).to.be.called;
            expect(annotatorUtil.replacePlaceholders).to.be.called;
            expect(annotatorUtil.showElement).to.be.called;
        });

        it('should do nothing when given an invalid annotation or does not have a dialog', () => {
            expect(dialog.assignDrawingLabel, 'not empty').to.not.throw();

            dialog.drawingDialogEl = 'not empty';
            expect(dialog.assignDrawingLabel, undefined).to.not.throw();
            expect(dialog.assignDrawingLabel, null).to.not.throw();
        });
    });
});
