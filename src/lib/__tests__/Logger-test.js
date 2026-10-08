/* eslint-disable no-unused-expressions */
import Logger from '../Logger';

describe('lib/Logger', () => {
    let dateNowMock;
    let logger;

    beforeEach(() => {
        dateNowMock = jest.spyOn(Date, 'now').mockReturnValue(0);
        logger = new Logger('FOO', {});
    });

    afterEach(() => {
        dateNowMock.mockRestore();
        logger = null;
    });

    test('should have correct defaults', () => {
        dateNowMock.mockReturnValue(1);
        const log = logger.done();

        expect(log.time.total).toBe(1);
        expect(log.time.conversion).toBe(0);
        expect(log.time.rendering).toBe(1);

        expect(undefined).toEqual(log.type);
        expect('FOO').toEqual(log.locale);
        expect('preview').toEqual(log.event);

        expect(undefined).toEqual(log.file);

        expect(log.cache.hit).toBeFalsy();
        expect(log.cache.stale).toBeFalsy();

        expect(log.client.name).toBe(__NAME__);
        expect(log.client.version).toBe(__VERSION__);
    });

    test('should use the host-supplied client name when provided', () => {
        logger = new Logger('FOO', {}, 'preview-client');
        const log = logger.done();

        expect(log.client.name).toBe('preview-client');
        expect(log.client.version).toBe(__VERSION__);
    });

    test('should fall back to the package name when client name is empty', () => {
        logger = new Logger('FOO', {}, '');
        const log = logger.done();

        expect(log.client.name).toBe(__NAME__);
    });

    test('should set and get correctly', () => {
        logger.setCached();
        logger.setCacheStale();
        logger.setFile({ id: 1 });
        logger.setType('BAR');

        dateNowMock.mockReturnValue(100);
        logger.setUnConverted();

        const log = logger.done();

        expect(log.time.conversion).toBe(100);
        expect(log.time.rendering).toBe(0);
        expect(log.time.total).toBe(100);

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
            dateNowMock.mockReturnValue(100);

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
