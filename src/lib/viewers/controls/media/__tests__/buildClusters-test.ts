import buildClusters from '../buildClusters';
import { CommentMarker } from '../types';

describe('buildClusters', () => {
    test('should return empty array when markers is empty', () => {
        expect(buildClusters([], 60, 600)).toHaveLength(0);
    });

    test('should return empty array when trackWidth is 0', () => {
        const markers: CommentMarker[] = [{ id: 'm1', time: 10 }];
        expect(buildClusters(markers, 60, 0)).toHaveLength(0);
    });

    test('should return empty array when durationValue is 0', () => {
        const markers: CommentMarker[] = [{ id: 'm1', time: 10 }];
        expect(buildClusters(markers, 0, 500)).toHaveLength(0);
    });

    test('should return a single cluster for a single marker', () => {
        const markers: CommentMarker[] = [{ id: 'm1', time: 10 }];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].markers).toHaveLength(1);
        expect(clusters[0].isSinglePoint).toBe(true);
    });

    test('should not cluster markers that are far apart', () => {
        const markers: CommentMarker[] = [
            { id: 'm1', time: 10 },
            { id: 'm2', time: 30 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(2);
        expect(clusters[0].markers).toHaveLength(1);
        expect(clusters[1].markers).toHaveLength(1);
    });

    test('should cluster markers at the same timestamp', () => {
        const markers: CommentMarker[] = [
            { id: 'm1', time: 10 },
            { id: 'm2', time: 10 },
            { id: 'm3', time: 10 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].markers).toHaveLength(3);
        expect(clusters[0].isSinglePoint).toBe(true);
    });

    test('should cluster markers within threshold px of each other', () => {
        // trackWidth=600, duration=60 => 10px per second
        // markers at 10s and 10.1s => 100px and 101px => 1px apart => cluster
        const markers: CommentMarker[] = [
            { id: 'm1', time: 10 },
            { id: 'm2', time: 10.1 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].markers).toHaveLength(2);
        expect(clusters[0].isSinglePoint).toBe(false);
    });

    test('should not cluster markers that are more than threshold px apart', () => {
        // trackWidth=600, duration=60 => 10px per second
        // markers at 10s and 10.5s => 100px and 105px => 5px apart => no cluster
        const markers: CommentMarker[] = [
            { id: 'm1', time: 10 },
            { id: 'm2', time: 10.5 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(2);
    });

    test('should sort markers by time before clustering', () => {
        const markers: CommentMarker[] = [
            { id: 'm1', time: 30 },
            { id: 'm2', time: 10 },
            { id: 'm3', time: 10 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters).toHaveLength(2);
        expect(clusters[0].markers[0].id).toBe('m2');
        expect(clusters[0].markers[1].id).toBe('m3');
        expect(clusters[1].markers[0].id).toBe('m1');
    });

    test('should chain nearby markers into a single cluster', () => {
        // trackWidth=1000, duration=100 => 10px per second
        // A=10s(100px), C=10.1s(101px), B=10.2s(102px) — each 1px apart
        const markers: CommentMarker[] = [
            { id: 'A', time: 10 },
            { id: 'B', time: 10.2 },
            { id: 'C', time: 10.1 },
        ];
        const clusters = buildClusters(markers, 100, 1000);
        expect(clusters).toHaveLength(1);
        expect(clusters[0].markers).toHaveLength(3);
        expect(clusters[0].markers.map(m => m.id)).toEqual(['A', 'C', 'B']);
    });

    test('should compute correct leftPercent and rightPercent', () => {
        const markers: CommentMarker[] = [
            { id: 'm1', time: 6 },
            { id: 'm2', time: 6.1 },
        ];
        // 6/60 * 100 = 10%, 6.1/60 * 100 = 10.1667%
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters[0].leftPercent).toBeCloseTo(10, 2);
        expect(clusters[0].rightPercent).toBeCloseTo(10.1667, 2);
    });

    test('should generate id by joining marker ids', () => {
        const markers: CommentMarker[] = [
            { id: 'a', time: 10 },
            { id: 'b', time: 10 },
        ];
        const clusters = buildClusters(markers, 60, 600);
        expect(clusters[0].id).toBe('a|b');
    });
});
