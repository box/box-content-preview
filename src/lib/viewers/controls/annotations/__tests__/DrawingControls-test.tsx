import React from 'react';
import { render, screen } from '@testing-library/react';
import DrawingControls from '../DrawingControls';
import { AnnotationMode } from '../../../../types';

describe('DrawingControls', () => {
    describe('render', () => {
        test('should return nothing if annotationMode is not DRAWING', () => {
            render(<DrawingControls onAnnotationColorChange={jest.fn()} />);

            expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();
        });

        test('should return ColorPickerControl if annotationMode is DRAWING', () => {
            render(<DrawingControls annotationMode={AnnotationMode.DRAWING} onAnnotationColorChange={jest.fn()} />);

            expect(screen.getByTestId('bp-color-picker-control')).toBeInTheDocument();
        });
    });
});
