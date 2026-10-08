import commentMarkerRange from '../commentMarkerRange';

describe('commentMarkerRange', () => {
    test('should return null for a point comment', () => {
        expect(commentMarkerRange({ time: 4.2 })).toBeNull();
        expect(commentMarkerRange({ endTime: undefined, time: 4.2 })).toBeNull();
        expect(commentMarkerRange(null)).toBeNull();
    });

    test('should return null when the end does not fall after the start', () => {
        expect(commentMarkerRange({ endTime: 4.2, time: 4.2 })).toBeNull();
        expect(commentMarkerRange({ endTime: 1, time: 4.2 })).toBeNull();
        expect(commentMarkerRange({ endTime: Number.NaN, time: 4.2 })).toBeNull();
    });

    test('should convert a host range from seconds to milliseconds', () => {
        expect(commentMarkerRange({ endTime: 12, time: 8.055 })).toEqual({ endMs: 12000, startMs: 8055 });
    });
});
