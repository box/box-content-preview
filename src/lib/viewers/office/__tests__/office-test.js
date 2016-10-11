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
        it('should load a xlsx file and fire load event', (done) => {
            const office = new Office('.container', {
                file: {
                    id: '123',
                    extension: 'xlsx'
                }
            });

            office.on('load', () => {
                assert.equal(office.iframeEl.src, 'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
                done();
            });

            office.load();
        });
    });
});
