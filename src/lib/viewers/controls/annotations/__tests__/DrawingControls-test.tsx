import React from 'react';
import { render } from '@testing-library/react';
import DrawingControls from '../DrawingControls';
import { AnnotationMode } from '../../../../types';

describe('DrawingControls', () => {
    const getWrapper = (props = {}) => render(<DrawingControls onAnnotationColorChange={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return nothing if annotationMode is not DRAWING', () => {
            const wrapper = getWrapper();

            expect(wrapper.container).toBeEmptyDOMElement();
        });

        test('should return ColorPickerControl if annotationMode is DRAWING', () => {
            const wrapper = getWrapper({ annotationMode: AnnotationMode.DRAWING });

            expect(wrapper.queryByTestId('bp-ColorPickerControl-toggle')).toBeInTheDocument();
        });
    });
});
