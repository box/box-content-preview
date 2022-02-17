import IFrameViewer from '../IFrameViewer';
import BaseViewer from '../../BaseViewer';

let containerEl;
let iframe;

describe('lib/viewers/iframe/IFrameViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/iframe/__tests__/IFrameViewer-test.html');
        containerEl = document.querySelector('.container');
        iframe = new IFrameViewer({
            container: containerEl,
            file: {
                id: '123',
                extension: 'boxnote',
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        iframe.containerEl = containerEl;
        iframe.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (iframe && typeof iframe.destroy === 'function') {
            iframe.destroy();
        }
        iframe = null;
    });

    describe('setup()', () => {
        test('should setup iframe element and load timeout', () => {
            expect(iframe.iframeEl).toBeInstanceOf(HTMLElement);
            expect(iframe.iframeEl).toHaveAttribute('width', '100%');
            expect(iframe.iframeEl).toHaveAttribute('height', '100%');
            expect(iframe.iframeEl).toHaveAttribute('frameborder', '0');
            expect(iframe.loadTimeout).toBe(120000);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            iframe.options.appHost = 'https://app.box.com';
        });

        test('should load a boxnote and fire load event', done => {
            iframe.on('load', () => {
                expect(iframe.iframeEl.src).toEqual('https://app.box.com/notes_embedded/123?isReadonly=1&is_preview=1');
                done();
            });

            iframe.load();
        });

        test('should load a boxnote with a shared name if a shared link exists and fire load event', done => {
            iframe.options.sharedLink = 'https://app.box.com/s/foobar';

            iframe.on('load', () => {
                expect(iframe.iframeEl.src).toEqual(
                    'https://app.box.com/notes_embedded/123?isReadonly=1&is_preview=1&s=foobar',
                );
                done();
            });

            iframe.load();
        });

        test('should invoke startLoadTimer()', () => {
            const stub = jest.spyOn(iframe, 'startLoadTimer');
            iframe.load();

            expect(stub).toBeCalled(); // eslint-disable-line no-unused-expressions
        });
    });
});
