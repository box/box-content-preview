/* eslint-disable no-unused-expressions */
import Logger from '../Logger';

describe('lib/Logger', () => {
    const dateNowStub = jest.spyOn(Date, 'now');
    let logger;

    beforeEach(() => {
        dateNowStub.mockReturnValue(0);
        logger = new Logger('FOO', {});
    });

    afterEach(() => {
        logger = null;
    });

    test('should have correct defaults', () => {
        dateNowStub.mockReturnValue(1); // Took 1 ms to run
        const log = logger.done();

        expect(log.time.total < 5).toBe(true);
        expect(log.time.conversion < 5).toBe(true);
        expect(log.time.rendering < 5).toBe(true);

        expect(undefined).toEqual(log.type);
        expect('FOO').toEqual(log.locale);
        expect('preview').toEqual(log.event);

        expect(undefined).toEqual(log.file);

        expect(log.cache.hit).toBeFalsy();
        expect(log.cache.stale).toBeFalsy();

        expect(log.client.name).toBe(__NAME__);
        expect(log.client.version).toBe(__VERSION__);
    });

    test('should set and get correctly', () => {
        dateNowStub.mockReturnValue(0);
        logger.setCached();
        logger.setCacheStale();
        logger.setFile({ id: 1 });
        logger.setType('BAR');

        dateNowStub.mockReturnValue(100);
        logger.setUnConverted();

        const log = logger.done();

        expect('number').toEqual(typeof log.time.total);
        expect('number').toEqual(typeof log.time.conversion);
        expect('number').toEqual(typeof log.time.rendering);
        expect(log.time.total).toEqual(log.time.conversion + log.time.rendering);

        expect('BAR').toEqual(log.type);
        expect('FOO').toEqual(log.locale);

        expect(1).toEqual(log.file.id);

        expect(log.cache.hit).toBeTruthy();
        expect(log.cache.stale).toBeTruthy();
    });

    describe('setCached()', () => {
        test('should indicate a cache hit', () => {
            logger.setCached();

            expect(logger.log.cache.hit).toBeTruthy();
        });
    });

    describe('setUnConverted()', () => {
        test('should set converted to false', () => {
            logger.setUnConverted();

            expect(logger.log.converted).toBeFalsy();
        });
    });

    describe('setPreloaded()', () => {
        test('should set preloaded time', () => {
            logger.start = 0;
            jest.spyOn(Date, 'now').mockReturnValue(100);

            logger.setPreloaded();

            expect(logger.log.time.preload).toBe(100);
        });
    });

    describe('setFile()', () => {
        test('should set the file', () => {
            logger.setFile('file');

            expect(logger.log.file).toEqual('file');
        });
    });

    describe('setType()', () => {
        test('should set the type', () => {
            logger.setType('type');

            expect(logger.log.type).toEqual('type');
        });
    });

    describe('done()', () => {
        test('should set the count, rendering time, and return the log', () => {
            const log = logger.done(0);

            expect(logger.log.count).toEqual(0);
            expect(log).toEqual(logger.log);
        });
    });
});
