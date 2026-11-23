import React from 'react';
import {
    getBufferedTrackStops,
    round,
    percent,
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

    describe('round', () => {
        test('should round to 4 decimal places', () => {
            expect(round(1.23456789)).toBe(1.2346);
        });

        test('should not add unnecessary decimals', () => {
            expect(round(5)).toBe(5);
        });

        test('should handle 0', () => {
            expect(round(0)).toBe(0);
        });
    });

    describe('percent', () => {
        test('should calculate percentage correctly', () => {
            expect(percent(10, 60)).toBeCloseTo(16.6667, 4);
        });

        test('should return 100 for equal values', () => {
            expect(percent(60, 60)).toBe(100);
        });

        test('should return 50 for half', () => {
            expect(percent(30, 60)).toBe(50);
        });

        test('should return 0 for zero numerator', () => {
            expect(percent(0, 60)).toBe(0);
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
