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
