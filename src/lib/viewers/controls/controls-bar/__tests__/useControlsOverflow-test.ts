import { ALWAYS_OVERFLOW, ControlsBarItem, getOverflowIds, Metrics } from '../useControlsOverflow';

describe('getOverflowIds', () => {
    const item = (id: string, priority?: number, hasMenu = true): ControlsBarItem => ({
        control: id,
        id,
        menu: hasMenu ? id : undefined,
        priority,
    });
    const getMetrics = (widths: Record<string, number>, overrides: Partial<Metrics> = {}): Metrics => ({
        chrome: 0,
        gap: 0,
        triggerWidth: 10,
        widths: new Map(Object.entries(widths)),
        ...overrides,
    });
    const getIds = (...args: Parameters<typeof getOverflowIds>): string[] => Array.from(getOverflowIds(...args));

    test('should collapse nothing if every control fits and none always overflows', () => {
        const items = [item('a', 1), item('b')];

        expect(getIds(items, 20, getMetrics({ a: 10, b: 10 }))).toEqual([]);
    });

    test('should always collapse the controls that always overflow', () => {
        const items = [item('a', ALWAYS_OVERFLOW), item('b', 1), item('c')];

        expect(getIds(items, Infinity, getMetrics({ a: 10, b: 10, c: 10 }))).toEqual(['a']);
    });

    test('should collapse controls in ascending priority until the bar fits', () => {
        const items = [item('a', 2), item('b', 1), item('c', 3), item('d')];
        const metrics = getMetrics({ a: 10, b: 20, c: 10, d: 10 });

        // a + c + d + trigger
        expect(getIds(items, 45, metrics)).toEqual(['b']);
        // c + d + trigger
        expect(getIds(items, 35, metrics)).toEqual(['b', 'a']);
    });

    test('should collapse controls that share a priority together', () => {
        const items = [item('a', 1), item('b', 1), item('c', 2)];

        expect(getIds(items, 25, getMetrics({ a: 10, b: 10, c: 10 }))).toEqual(['a', 'b']);
    });

    test('should keep pinned controls on the bar even if it still does not fit', () => {
        const items = [item('a', 1), item('b'), item('c', 2, false)];

        expect(getIds(items, 0, getMetrics({ a: 10, b: 10, c: 10 }))).toEqual(['a']);
    });

    test('should count the chrome, the gaps between slots, and the trigger once something collapses', () => {
        const items = [item('a', ALWAYS_OVERFLOW), item('b', 1), item('c')];
        const metrics = getMetrics({ a: 10, b: 10, c: 10 }, { chrome: 10, gap: 4, triggerWidth: 20 });

        // 10 + (10 + 10 + 20) + 4 * 2
        expect(getIds(items, 58, metrics)).toEqual(['a']);
        expect(getIds(items, 57, metrics)).toEqual(['a', 'b']);
    });

    test('should estimate a button width for controls and a trigger that have not been measured', () => {
        const items = [item('a', 1), item('b', 2)];
        const metrics = getMetrics({}, { triggerWidth: undefined });

        expect(getIds(items, 64, metrics)).toEqual([]);
        // b + trigger is still 64
        expect(getIds(items, 63, metrics)).toEqual(['a', 'b']);
    });
});
