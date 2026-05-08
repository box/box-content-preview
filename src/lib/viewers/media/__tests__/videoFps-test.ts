import { getVideoFps, isFpsAvailable, ShakaPlayer } from '../videoFps';

describe('videoFps', () => {
    describe('getVideoFps()', () => {
        test('should return fps from active track', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [
                    { frameRate: 30, active: true },
                    { frameRate: 24, active: false },
                ],
            };
            expect(getVideoFps(player)).toBe(30);
        });

        test('should fall back to any track with fps if no active track has it', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ active: true }, { frameRate: 25, active: false }],
            };
            expect(getVideoFps(player)).toBe(25);
        });

        test('should return 24 if no tracks have fps', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ active: true }],
            };
            expect(getVideoFps(player)).toBe(24);
        });

        test('should return 24 if player is undefined', () => {
            expect(getVideoFps(undefined)).toBe(24);
        });

        test('should ignore zero frameRate', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ frameRate: 0, active: true }],
            };
            expect(getVideoFps(player)).toBe(24);
        });
    });

    describe('isFpsAvailable()', () => {
        test('should return true if any track has frameRate', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ frameRate: 30 }],
            };
            expect(isFpsAvailable(player)).toBe(true);
        });

        test('should return false if no tracks have frameRate', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ active: true }],
            };
            expect(isFpsAvailable(player)).toBe(false);
        });

        test('should return false if player is undefined', () => {
            expect(isFpsAvailable(undefined)).toBe(false);
        });

        test('should return false if frameRate is zero', () => {
            const player: ShakaPlayer = {
                getVariantTracks: () => [{ frameRate: 0 }],
            };
            expect(isFpsAvailable(player)).toBe(false);
        });
    });
});
