import Office from '../office';

const sandbox = sinon.sandbox.create();

describe('office.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/office/__tests__/office-test.html');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('constructor()', () => {
        it('should initialize iframe element and set relevant attributes', () => {
            const office = new Office('.container');
            expect(office.iframeEl.width).to.equal('100%');
            expect(office.iframeEl.height).to.equal('100%');
            expect(office.iframeEl.frameBorder).to.equal('0');
            expect(office.iframeEl.sandbox.toString()).to.equal('allow-scripts allow-same-origin allow-forms');
            expect(office.loadTimeout).to.equal(120000);
        });
    });

    describe('load()', () => {
        it('should load a xlsx file and set the file ID in src url on load event when the file is not a shared link', (done) => {
            const office = new Office('.container', {
                file: {
                    id: '123'
                }
            });

            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
                done();
            });

            office.load();
        });

        it('should load a xlsx file and set the shared name in src url on load event when the file is a shared link', (done) => {
            const office = new Office('.container', {
                sharedLink: 'https://app.box.com/s/abcd',
                file: {
                    id: '123'
                }
            });

            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123');
                done();
            });

            office.load();
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url', (done) => {
            const office = new Office('.container', {
                sharedLink: 'https://app.box.com/v/test',
                file: {
                    id: '123'
                }
            });

            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&fileId=123');
                done();
            });

            office.load();
        });
    });
});
