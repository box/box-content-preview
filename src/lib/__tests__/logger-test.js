import Logger from '../logger';

describe('Logger', () => {
    it('should have correct defaults', () => {
        const logger = new Logger('FOO');
        const log = logger.done();

        assert.equal(0, log.time.total);
        assert.equal(0, log.time.conversion);
        assert.equal(0, log.time.rendering);

        assert.equal(undefined, log.type);
        assert.equal('FOO', log.locale);
        assert.equal('preview', log.event);

        assert.equal(undefined, log.file);

        assert.notOk(log.cache.hit);
        assert.notOk(log.cache.stale);
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

        assert.equal('number', typeof log.time.total);
        assert.equal('number', typeof log.time.conversion);
        assert.equal('number', typeof log.time.rendering);
        assert.equal(log.time.total, log.time.conversion + log.time.rendering);

        assert.equal('BAR', log.type);
        assert.equal('FOO', log.locale);

        assert.equal(1, log.file.id);

        assert.ok(log.cache.hit);
        assert.ok(log.cache.stale);
    });
});
