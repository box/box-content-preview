import React from 'react';
import { render, screen } from '@testing-library/react';
import DrawingControls from '../DrawingControls';
import { AnnotationMode } from '../../../../types';

describe('DrawingControls', () => {
    const renderView = (props = {}) => render(<DrawingControls onAnnotationColorChange={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return nothing if annotationMode is not DRAWING', () => {
            renderView();

            expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();
        });

        test('should return ColorPickerControl if annotationMode is DRAWING', () => {
            renderView({ annotationMode: AnnotationMode.DRAWING });

            expect(screen.getByTestId('bp-color-picker-control')).toBeInTheDocument();
        });
    });
});
