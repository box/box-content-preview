/* eslint-disable no-unused-expressions */
import DocPointDialog from '../DocPointDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';

let pointDialog;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocPointDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocPointDialog-test.html');

        pointDialog = new DocPointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        pointDialog.setup([]);
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
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'fitDialogHeightInPage');

            pointDialog.position();

            expect(docAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
        });
    });
});
