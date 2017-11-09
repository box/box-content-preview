/* eslint-disable no-unused-expressions */
import FileMetrics from '../FileMetrics';

let fileMetrics;
const sandbox = sinon.sandbox.create();

describe('lib/FileMetrics', () => {
    let dateNowStub = sandbox.stub(Date, 'now');

    beforeEach(() => {
        dateNowStub.returns(0);
        fileMetrics = new FileMetrics('FOO', {});
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fileMetrics = null;
    });

    it('should have correct defaults', () => {
        dateNowStub.returns(1); // Took 1 ms to run
        const log = fileMetrics.done();

        assert.ok(log.time.total < 5, 'Total time should be correct');
        assert.ok(log.time.conversion < 5, 'Conversion time should be correct');
        assert.ok(log.time.rendering < 5, 'Rendering time should be correct');

        assert.equal(undefined, log.type, 'Type should be correct');
        assert.equal('FOO', log.locale, 'Locale should be correct');
        assert.equal('preview', log.event, 'Event should be correct');

        assert.equal(undefined, log.file, 'File should be correct');

        assert.notOk(log.cache.hit, 'Cache should not be hit');
        assert.notOk(log.cache.stale, 'Cache should not be stale');

        /* eslint-disable no-undef */
        expect(log.client.name).to.equal(__NAME__);
        expect(log.client.version).to.equal(__VERSION__);
        /* eslint-enable no-undef */
    });

    it('should set and get correctly', () => {
        dateNowStub.returns(0); 
        fileMetrics.setCached();
        fileMetrics.setCacheStale();
        fileMetrics.setFile({ id: 1 });
        fileMetrics.setType('BAR');

        dateNowStub.returns(100);
        fileMetrics.setUnConverted();

        const log = fileMetrics.done();

        assert.equal('number', typeof log.time.total, 'Total time should be a number');
        assert.equal('number', typeof log.time.conversion, 'Conversion time should be a number');
        assert.equal('number', typeof log.time.rendering, 'Conversion time should be a number');
        assert.equal(log.time.total, log.time.conversion + log.time.rendering, 'Total time should add up');

        assert.equal('BAR', log.type, 'Type should be correct');
        assert.equal('FOO', log.locale, 'Locale should be correct');

        assert.equal(1, log.file.id, 'File ID should be correct');

        assert.ok(log.cache.hit, 'Cache should be hit');
        assert.ok(log.cache.stale, 'Cache should be stale');
    });

    describe('setCached()', () => {
        it('should indicate a cache hit', () => {
            fileMetrics.setCached();

            assert.ok(fileMetrics.log.cache.hit);
        });
    });

    describe('setUnConverted()', () => {
        it('should set converted to false', () => {
            fileMetrics.setUnConverted();

            assert.notOk(fileMetrics.log.converted);
        });
    });

    describe('setPreloaded()', () => {
        it('should set preloaded time', () => {
            fileMetrics.start = 0;
            sandbox.stub(Date, 'now').returns(100);

            fileMetrics.setPreloaded();

            expect(fileMetrics.log.time.preload).to.equal(100);
        });
    });

    describe('setFile()', () => {
        it('should set the file', () => {
            fileMetrics.setFile('file');

            assert.equal(fileMetrics.log.file, 'file');
        });
    });

    describe('setType()', () => {
        it('should set the type', () => {
            fileMetrics.setType('type');

            assert.equal(fileMetrics.log.type, 'type');
        });
    });

    describe('done()', () => {
        it('should set the count, rendering time, and return the log', () => {
            const log = fileMetrics.done(0);

            assert.equal(fileMetrics.log.count, 0);
            assert.equal(log, fileMetrics.log);
        });
    });
});
