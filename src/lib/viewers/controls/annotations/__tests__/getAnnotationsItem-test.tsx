import React from 'react';
import AnnotationsControlsV2, { Props } from '../AnnotationsControlsV2';
import getAnnotationsItem from '../getAnnotationsItem';
import { AnnotationMode } from '../../../../types';

describe('getAnnotationsItem', () => {
    const props: Props = {
        annotationMode: AnnotationMode.REGION,
        modes: [AnnotationMode.REGION, AnnotationMode.DRAWING],
        onAnnotationModeClick: jest.fn(),
        onAnnotationModeEscape: jest.fn(),
    };

    test('should keep the markup controls on the bar without a menu form', () => {
        expect(getAnnotationsItem(props)).toEqual({
            control: <AnnotationsControlsV2 {...props} />,
            id: 'annotations',
        });
    });

    test('should leave out the markup controls if no mode is enabled', () => {
        expect(getAnnotationsItem({ ...props, modes: [] })).toBe(false);
    });
});
