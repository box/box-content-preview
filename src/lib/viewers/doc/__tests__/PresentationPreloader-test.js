/* eslint-disable no-unused-expressions */
import PresentationPreloader from '../PresentationPreloader';
import * as util from '../../../util';
import { CLASS_INVISIBLE } from '../../../constants';

let preloader;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/doc/PresentationPreloader', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/PresentationPreloader-test.html');
        preloader = new PresentationPreloader({
            hideLoadingIndicator: () => {}
        });
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('scaleAndShowPreload()', () => {
        beforeEach(() => {
            stubs.checkDocumentLoaded = sandbox.stub(
                preloader,
                'checkDocumentLoaded'
            );
            stubs.emit = sandbox.stub(preloader, 'emit');
            stubs.setDimensions = sandbox.stub(util, 'setDimensions');
            stubs.hideLoadingIndicator = sandbox.stub(
                preloader.ui,
                'hideLoadingIndicator'
            );
            preloader.imageEl = {};
            preloader.preloadEl = document.createElement('div');
        });

        it('should not do anything if document is loaded', () => {
            stubs.checkDocumentLoaded.returns(true);

            preloader.scaleAndShowPreload(1, 1, 1);

            expect(stubs.setDimensions).to.not.be.called;
            expect(stubs.hideLoadingIndicator).to.not.be.called;
        });

        it('should set preload image dimensions, hide loading indicator, show preload element, and emit preload event', () => {
            preloader.preloadEl.classList.add(CLASS_INVISIBLE);

            const width = 100;
            const height = 100;

            preloader.scaleAndShowPreload(width, height, 1);

            expect(stubs.setDimensions).to.be.calledWith(
                preloader.imageEl,
                width,
                height
            );
            expect(stubs.hideLoadingIndicator).to.be.called;
            expect(stubs.emit).to.be.calledWith('preload');
            expect(preloader.preloadEl).to.not.have.class(CLASS_INVISIBLE);
        });
    });
});
