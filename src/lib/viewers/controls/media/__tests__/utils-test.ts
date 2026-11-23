import React from 'react';
import {
    getBufferedTrackStops,
    getPercent,
    isTimeBuffered,
    roundToFourDecimals,
    stopActivationKeyPropagation,
    stopMenuTriggerKeyPropagation,
} from '../utils';

describe('utils', () => {
    describe('getBufferedTrackStops', () => {
        const createRanges = (ranges: Array<[number, number]>): TimeRanges => ({
            end: (index: number) => ranges[index][1],
            length: ranges.length,
            start: (index: number) => ranges[index][0],
        });
        const options = { bufferedColor: 'b', durationTime: 100, fromPercentage: 0, unplayedColor: 'u' };

        test('should paint each buffered range from the starting percentage', () => {
            const bufferedRange = createRanges([
                [0, 10],
                [20, 40],
                [50, 60],
            ]);

            expect(getBufferedTrackStops({ ...options, bufferedRange })).toBe(
                'u 0%, b 0%, b 10%, u 10%, u 20%, b 20%, b 40%, u 40%, u 50%, b 50%, b 60%, u 60%, u 100%',
            );
            expect(getBufferedTrackStops({ ...options, bufferedRange, fromPercentage: 30 })).toBe(
                'u 30%, b 30%, b 40%, u 40%, u 50%, b 50%, b 60%, u 60%, u 100%',
            );
        });

        test('should paint only unplayed without ranges or duration', () => {
            expect(getBufferedTrackStops(options)).toBe('u 100%');
            expect(getBufferedTrackStops({ ...options, bufferedRange: createRanges([[0, 10]]), durationTime: 0 })).toBe(
                'u 100%',
            );
        });
    });

    describe('isTimeBuffered', () => {
        const bufferedRange: TimeRanges = {
            end: (index: number) => [10, 40][index],
            length: 2,
            start: (index: number) => [0, 20][index],
        };

        test.each([
            [0, true],
            [9.9, true],
            [10, false],
            [15, false],
            [20, true],
            [40, false],
        ])('at %s should return %s', (time, expected) => {
            expect(isTimeBuffered(bufferedRange, time)).toBe(expected);
        });
    });

    describe('roundToFourDecimals', () => {
        test('should round to 4 decimal places', () => {
            expect(roundToFourDecimals(1.23456789)).toBe(1.2346);
        });

        test('should not add unnecessary decimals', () => {
            expect(roundToFourDecimals(5)).toBe(5);
        });

        test('should handle 0', () => {
            expect(roundToFourDecimals(0)).toBe(0);
        });
    });

    describe('getPercent', () => {
        test('should calculate percentage correctly', () => {
            expect(getPercent(10, 60)).toBeCloseTo(16.6667, 4);
        });

        test('should return 100 for equal values', () => {
            expect(getPercent(60, 60)).toBe(100);
        });

        test('should return 50 for half', () => {
            expect(getPercent(30, 60)).toBe(50);
        });

        test('should return 0 for zero numerator', () => {
            expect(getPercent(0, 60)).toBe(0);
        });
    });

    describe('stopActivationKeyPropagation', () => {
        const createEvent = (key: string) =>
            ({ key, stopPropagation: jest.fn() }) as unknown as React.KeyboardEvent & { stopPropagation: jest.Mock };

        test.each(['Enter', ' '])('should stop propagation for %p', key => {
            const event = createEvent(key);
            stopActivationKeyPropagation(event);
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        test('should let other keys bubble', () => {
            const event = createEvent('ArrowLeft');
            stopActivationKeyPropagation(event);
            expect(event.stopPropagation).not.toHaveBeenCalled();
        });
    });

    describe('stopMenuTriggerKeyPropagation', () => {
        const createEvent = (key: string) =>
            ({ key, stopPropagation: jest.fn() }) as unknown as React.KeyboardEvent & { stopPropagation: jest.Mock };

        test.each(['ArrowDown', 'ArrowUp', 'Enter', ' '])('should stop propagation for %p', key => {
            const event = createEvent(key);
            stopMenuTriggerKeyPropagation(event);
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        test.each(['ArrowLeft', 'ArrowRight', 'm'])('should let %p bubble', key => {
            const event = createEvent(key);
            stopMenuTriggerKeyPropagation(event);
            expect(event.stopPropagation).not.toHaveBeenCalled();
        });
    });
});
