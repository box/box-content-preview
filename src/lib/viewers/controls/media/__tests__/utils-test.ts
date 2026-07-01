import { round, percent } from '../utils';

describe('utils', () => {
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
});
