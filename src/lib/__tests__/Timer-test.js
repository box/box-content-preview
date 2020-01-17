/* eslint-disable no-unused-expressions */
import Timer from '../Timer';

describe('lib/Timer', () => {
    const tag = 'test';

    afterEach(() => {
        Timer.times = {};
    });

    describe('start()', () => {
        test("should create a new entry if one doesn't exist", () => {
            expect(Timer.get(tag)).not.toBeDefined();
            Timer.start(tag);
            expect(Timer.get(tag)).toBeDefined();
        });

        test('should do nothing if it has already been started', () => {
            jest.spyOn(global.performance, 'now');
            Timer.start(tag);
            Timer.start(tag);
            expect(global.performance.now).toBeCalledTimes(1);
        });

        test('should set time.start to current time, using performance', () => {
            const time = 100;
            jest.spyOn(global.performance, 'now').mockReturnValue(time);
            Timer.start(tag);
            expect(Timer.get(tag).start).toEqual(time);
        });

        test('should reset end and elapsed of the time object', () => {
            // Setup so that we can call start again, but elapsed and end have value in them
            Timer.start(tag);
            Timer.stop(tag);
            Timer.get(tag).start = undefined;
            // Actual run
            Timer.start(tag);

            expect(Timer.get(tag).start).toBeDefined();
            expect(Timer.get(tag).end).not.toBeDefined();
            expect(Timer.get(tag).elapsed).not.toBeDefined();
        });
    });

    describe('stop()', () => {
        test('should do nothing if no time entry exists', () => {
            jest.spyOn(global.performance, 'now');
            Timer.stop();
            expect(global.performance.now).not.toBeCalled();
        });

        test('should do nothing if no time has been started', () => {
            jest.spyOn(global.performance, 'now');
            Timer.times[tag] = { start: undefined };

            Timer.stop(tag);
            expect(global.performance.now).not.toBeCalled();
        });

        test('should do nothing if it has already been stopped', () => {
            jest.spyOn(global.performance, 'now');
            Timer.times[tag] = { start: 1234, end: 2234 };

            Timer.stop(tag);
            expect(global.performance.now).not.toBeCalled();
        });

        test('should set the end prop, and calculate the elapsed time', () => {
            jest.spyOn(global.performance, 'now').mockReturnValue(5);
            Timer.times[tag] = { start: 3.5 };

            Timer.stop(tag);
            expect(Timer.get(tag).elapsed).toBe(2);
        });

        test('should stop and return the value at the given tag', () => {
            jest.spyOn(global.performance, 'now').mockReturnValue(5);
            Timer.times[tag] = { start: 3.5 };

            expect(Timer.stop(tag).elapsed).toBe(2);
        });
    });

    describe('get()', () => {
        test('should return the value at the given tag', () => {
            const otherTag = 'other';
            Timer.start(tag);
            Timer.start(otherTag);

            expect(Timer.get(tag)).toEqual(Timer.times[tag]);
            expect(Timer.get(otherTag)).toEqual(Timer.times[otherTag]);
            expect(Timer.get('yet another!')).not.toBeDefined();
        });
    });

    describe('reset()', () => {
        test('should reset the time structure values at the given tag', () => {
            Timer.start(tag);
            Timer.stop(tag);
            Timer.reset(tag);

            expect(Timer.get(tag)).toBeDefined();
            expect(Timer.get(tag).start).not.toBeDefined();
            expect(Timer.get(tag).end).not.toBeDefined();
            expect(Timer.get(tag).elapsed).not.toBeDefined();
        });

        test('should reset all of the time structures, when no params supplied', () => {
            Timer.start(tag);
            Timer.stop(tag);
            const other = 'another_tag';
            Timer.start(other);
            Timer.stop(other);

            Timer.reset();

            expect(Timer.get(tag).start).not.toBeDefined();
            expect(Timer.get(tag).end).not.toBeDefined();
            expect(Timer.get(tag).elapsed).not.toBeDefined();
            expect(Timer.get(other).start).not.toBeDefined();
            expect(Timer.get(other).end).not.toBeDefined();
            expect(Timer.get(other).elapsed).not.toBeDefined();
        });

        test('should reset multiple tags given an array of tags', () => {
            Timer.start(tag);
            Timer.stop(tag);
            const other = 'other_tag';
            Timer.start(other);
            Timer.stop(other);
            const another = 'another_tag';
            Timer.start(another);
            Timer.stop(another);
            Timer.reset([tag, other]);

            expect(Timer.get(tag).start).not.toBeDefined();
            expect(Timer.get(tag).end).not.toBeDefined();
            expect(Timer.get(tag).elapsed).not.toBeDefined();
            expect(Timer.get(other).start).not.toBeDefined();
            expect(Timer.get(other).end).not.toBeDefined();
            expect(Timer.get(other).elapsed).not.toBeDefined();
            expect(Timer.get(another).start).toBeDefined();
            expect(Timer.get(another).end).toBeDefined();
            expect(Timer.get(another).elapsed).toBeDefined();
        });
    });

    describe('createTag()', () => {
        test('should create a compliant tag that follows file_<ID>_<NAME>', () => {
            const createdTag = Timer.createTag('my_id', 'my_name');
            expect(createdTag).toBe('file_my_id_my_name');
        });
    });

    describe('create()', () => {
        test('should create a new time structure at "tag" in the times dictionary', () => {
            Timer.create(tag);
            expect(Timer.get(tag)).toEqual({ start: undefined, end: undefined, elapsed: undefined });
        });
    });
});
