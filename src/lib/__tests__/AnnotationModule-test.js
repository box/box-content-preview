import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import Cache from '../Cache';
import AnnotationModule, { ANNOTATION_COLOR_KEY } from '../AnnotationModule';

describe('lib/AnnotationModule', () => {
    test('initial load', () => {
        const cache = {
            get: jest.fn(),
            set: jest.fn(),
        };

        const annotationModule = new AnnotationModule({ cache });

        expect(annotationModule.cache.get).toHaveBeenCalledWith(ANNOTATION_COLOR_KEY);
        expect(annotationModule.cache.set).toHaveBeenCalledWith(ANNOTATION_COLOR_KEY, bdlBoxBlue, true);
    });

    test('getColor', () => {
        const cache = new Cache();
        const annotationModule = new AnnotationModule({ cache });

        expect(annotationModule.getColor()).toBe(bdlBoxBlue);
    });

    test('setColor', () => {
        const cache = new Cache();
        const color = '#fff';
        const annotationModule = new AnnotationModule({ cache });

        annotationModule.setColor(color);

        expect(annotationModule.getColor()).toBe(color);
    });
});
