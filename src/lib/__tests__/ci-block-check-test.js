describe('CI block check', () => {
    test('fails on purpose to confirm CI Status blocks merging', () => {
        expect(true).toBe(false);
    });
});
