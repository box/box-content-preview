import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import AnnotationModule from '../AnnotationModule';
import Cache from '../Cache';

describe('lib/AnnotationModule', () => {
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
