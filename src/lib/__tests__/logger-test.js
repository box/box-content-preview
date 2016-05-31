import Logger from '../logger';

describe('Logger', () => {
    it('should have correct defaults', () => {
        const logger = new Logger('FOO');
        const log = logger.done();

        assert.ok(log.time.total < 5, 'Total time should be correct');
        assert.ok(log.time.conversion < 5, 'Conversion time should be correct');
        assert.ok(log.time.rendering < 5, 'Rendering time should be correct');

        assert.equal(undefined, log.type, 'Type should be correct');
        assert.equal('FOO', log.locale, 'Locale should be correct');
        assert.equal('preview', log.event, 'Event should be correct');

        assert.equal(undefined, log.file, 'File should be correct');

        assert.notOk(log.cache.hit, 'Cache should not be hit');
        assert.notOk(log.cache.stale, 'Cache should not be stale');
    });

    it('should set and get correctly', () => {
        const now = Date.now();
        const logger = new Logger('FOO');
        logger.setCached();
        logger.setCacheStale();
        logger.setFile({ id: 1 });
        logger.setType('BAR');

        while (Date.now() - now > 100) {
            // do nothing
        }

        logger.setUnConverted();

        const log = logger.done();

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
});
