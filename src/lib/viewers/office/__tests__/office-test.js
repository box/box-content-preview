import Office from '../office';

const sandbox = sinon.sandbox.create();
let office;

describe('office.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/office/__tests__/office-test.html');
        office = new Office({
            container: '.container',
            file: {
                id: '123'
            }
        });
        office.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (office && typeof office.destroy === 'function') {
            office.destroy();
        }
        office = null;
    });

    describe('setup()', () => {
        it('should initialize iframe element and set relevant attributes', () => {
            expect(office.iframeEl.width).to.equal('100%');
            expect(office.iframeEl.height).to.equal('100%');
            expect(office.iframeEl.frameBorder).to.equal('0');
            expect(office.iframeEl.sandbox.toString()).to.equal('allow-scripts allow-same-origin allow-forms allow-popups');
            expect(office.loadTimeout).to.equal(120000);
        });
    });

    describe('load()', () => {
        it('should load a xlsx file and set the file ID in src url on load event when the file is not a shared link', (done) => {
            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
                done();
            });

            office.load();
        });

        it('should load a xlsx file and set the shared name in src url on load event when the file is a shared link', (done) => {
            office = new Office({
                sharedLink: 'https://app.box.com/s/abcd',
                file: {
                    id: '123'
                },
                container: '.container'
            });

            office.setup();
            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123');
                done();
            });

            office.load();
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url without a subdomain', (done) => {
            office = new Office({
                sharedLink: 'https://app.box.com/v/test',
                file: {
                    id: '123'
                },
                container: '.container'
            });

            office.setup();
            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=app&fileId=123');
                done();
            });

            office.load();
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url with a subdomain', (done) => {
            office = new Office({
                sharedLink: 'https://cloud.app.box.com/v/test',
                file: {
                    id: '123'
                },
                container: '.container'
            });

            office.setup();
            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=cloud&fileId=123');
                done();
            });

            office.load();
        });
    });
});
