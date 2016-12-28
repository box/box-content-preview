import IFrame from '../iframe';

const sandbox = sinon.sandbox.create();
let iframe;

describe('iframe.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/iframe/__tests__/iframe-test.html');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        iframe = null;
    });

    describe('load()', () => {
        it('should load a boxnote and fire load event', (done) => {
            iframe = new IFrame('.container', {
                file: {
                    id: '123',
                    extension: 'boxnote'
                }
            });

            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/notes/123?isReadonly=1&is_preview=1');
                done();
            });

            iframe.load();
        });

        it('should load a boxnote with a shared name if a shared link exists and fire load event', (done) => {
            iframe = new IFrame('.container', {
                file: {
                    id: '123',
                    extension: 'boxnote'
                },
                sharedLink: 'https://app.box.com/s/foobar'
            });

            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/notes/123?isReadonly=1&is_preview=1&s=foobar');
                done();
            });

            iframe.load();
        });

        it('should load a boxdicom and fire load event', (done) => {
            iframe = new IFrame('.container', {
                file: {
                    id: '123',
                    extension: 'boxdicom'
                }
            });

            iframe.on('load', () => {
                assert.equal(iframe.iframeEl.src, 'https://app.box.com/dicom_viewer/123');
                done();
            });

            iframe.load();
        });
    });
});
