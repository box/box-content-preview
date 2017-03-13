import IFrame from '../IFrame';

const sandbox = sinon.sandbox.create();
let containerEl;
let iframe;

describe('lib/viewers/iframe/IFrame', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/iframe/__tests__/IFrame-test.html');
        containerEl = document.querySelector('.container');
        iframe = new IFrame({
            container: containerEl,
            file: {
                id: '123',
                extension: 'boxnote'
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (iframe && typeof iframe.destroy === 'function') {
            iframe.destroy();
        }
        iframe = null;
    });

    describe('setup()', () => {
        it('should setup iframe element and load timeout', () => {
            iframe.setup();
            expect(iframe.iframeEl).to.be.instanceof(HTMLElement);
            expect(iframe.iframeEl).to.have.attribute('width', '100%');
            expect(iframe.iframeEl).to.have.attribute('height', '100%');
            expect(iframe.iframeEl).to.have.attribute('frameborder', '0');
            expect(iframe.loadTimeout).to.equal(120000);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            iframe.options.appHost = 'https://app.box.com';
        });

        it('should load a boxnote and fire load event', (done) => {
            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/notes/123?isReadonly=1&is_preview=1');
                done();
            });

            iframe.load();
        });

        it('should load a boxnote with a shared name if a shared link exists and fire load event', (done) => {
            iframe.options.sharedLink = 'https://app.box.com/s/foobar';

            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/notes/123?isReadonly=1&is_preview=1&s=foobar');
                done();
            });

            iframe.load();
        });

        it('should load a boxdicom and fire load event', (done) => {
            iframe.options.file.extension = 'boxdicom';

            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/dicom_viewer/123');
                done();
            });

            iframe.load();
        });
    });
});
