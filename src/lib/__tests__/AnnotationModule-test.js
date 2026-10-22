import AnnotationModule, { ANNOTATION_COLORS, AnnotationColor } from '../AnnotationModule';
import Cache from '../Cache';

describe('lib/AnnotationModule', () => {
    test('AnnotationColor', () => {
        expect(AnnotationColor).toEqual({
            BOX_BLUE: '#0061d5',
            GREEN_LIGHT: '#26c281',
            WATERMELON_RED: '#ed3757',
            YELLORANGE: '#f5b31b',
            YELLOW: '#ffd700',
            GRIMACE: '#4826c2',
        });
    });

    test('ANNOTATION_COLORS', () => {
        expect(ANNOTATION_COLORS).toEqual(['#0061d5', '#26c281', '#ed3757', '#f5b31b', '#ffd700', '#4826c2']);
    });

    test('getColor', () => {
        const cache = new Cache();
        const annotationModule = new AnnotationModule({ cache });

        expect(annotationModule.getColor()).toBe('#0061d5');
    });

    test('setColor', () => {
        const cache = new Cache();
        const color = '#fff';
        const annotationModule = new AnnotationModule({ cache });

        annotationModule.setColor(color);

        expect(annotationModule.getColor()).toBe(color);
    });
});
