/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../ImagePointDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';

let pointDialog;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImagePointDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImagePointDialog-test.html');

        pointDialog = new ImagePointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        pointDialog.setup([]);
        pointDialog.element.style.width = '282px';
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof pointDialog.destroy === 'function') {
            pointDialog.destroy();
            pointDialog = null;
        }
    });

    describe('position()', () => {
        it('should position the dialog at the right place and show it', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([141, 2]);
            sandbox.stub(annotatorUtil, 'repositionCaret');
            sandbox.stub(annotatorUtil, 'showElement');

            pointDialog.position();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.repositionCaret).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
        });
    });
});
