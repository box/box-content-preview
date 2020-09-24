/* eslint-disable no-unused-expressions */
import PresentationPreloader from '../PresentationPreloader';
import * as util from '../../../util';
import { CLASS_INVISIBLE } from '../../../constants';

let preloader;
let stubs;

describe('lib/viewers/doc/PresentationPreloader', () => {
    beforeEach(() => {
        fixture.load('viewers/doc/__tests__/PresentationPreloader-test.html');
        preloader = new PresentationPreloader({
            hideLoadingIndicator: () => {},
        });
        preloader.previewUI = {
            hideLoadingIndicator: jest.fn(),
        };
        stubs = {
            hideLoadingIndicator: preloader.previewUI.hideLoadingIndicator,
        };
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('scaleAndShowPreload()', () => {
        beforeEach(() => {
            stubs.checkDocumentLoaded = jest.spyOn(preloader, 'checkDocumentLoaded').mockImplementation();
            stubs.emit = jest.spyOn(preloader, 'emit').mockImplementation();
            stubs.setDimensions = jest.spyOn(util, 'setDimensions').mockImplementation();
            preloader.imageEl = {};
            preloader.preloadEl = document.createElement('div');
        });

        test('should not do anything if document is loaded', () => {
            stubs.checkDocumentLoaded.mockReturnValue(true);

            preloader.scaleAndShowPreload(1, 1, 1);

            expect(stubs.setDimensions).not.toBeCalled();
            expect(stubs.hideLoadingIndicator).not.toBeCalled();
        });

        test('should set preload image dimensions, hide loading indicator, show preload element, and emit preload event', () => {
            preloader.preloadEl.classList.add(CLASS_INVISIBLE);

            const width = 100;
            const height = 100;

            preloader.scaleAndShowPreload(width, height, 1);

            expect(stubs.setDimensions).toBeCalledWith(preloader.imageEl, width, height);
            expect(stubs.setDimensions).toBeCalledWith(preloader.overlayEl, width, height);
            expect(stubs.hideLoadingIndicator).toBeCalled();
            expect(stubs.emit).toBeCalledWith('preload');
            expect(preloader.preloadEl).not.toHaveClass(CLASS_INVISIBLE);
        });
    });
});
