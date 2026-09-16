import { isValidCommentRangeDraft } from '../types';

describe('isValidCommentRangeDraft', () => {
    test('should accept a collapsed draft', () => {
        expect(isValidCommentRangeDraft({ endMs: null, startMs: 2000 })).toBe(true);
    });

    test('should accept an open span', () => {
        expect(isValidCommentRangeDraft({ endMs: 4000, startMs: 2000 })).toBe(true);
    });

    test('should reject missing or inverted bounds', () => {
        expect(isValidCommentRangeDraft(null)).toBe(false);
        expect(isValidCommentRangeDraft({ startMs: Number.NaN })).toBe(false);
        expect(isValidCommentRangeDraft({ endMs: 1000, startMs: 2000 })).toBe(false);
        expect(isValidCommentRangeDraft({ endMs: 2000, startMs: 2000 })).toBe(false);
    });
});
