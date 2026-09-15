import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DocControlsV2 from '../DocControlsV2';
import { AnnotationMode } from '../../../types';

describe('DocControlsV2', () => {
    const getDefaults = () => ({
        onAnnotationColorChange: jest.fn(),
        onAnnotationModeClick: jest.fn(),
        onAnnotationModeEscape: jest.fn(),
        onFindBarToggle: jest.fn(),
        onFullscreenToggle: jest.fn(),
        onGalleryToggle: jest.fn(),
        onPageChange: jest.fn(),
        onPageSubmit: jest.fn(),
        onRotateLeft: jest.fn(),
        onThumbnailsToggle: jest.fn(),
        onZoomIn: jest.fn(),
        onZoomOut: jest.fn(),
        pageCount: 3,
        pageNumber: 1,
        scale: 1,
    });

    test('should render every document control on the Blueprint toolbar', () => {
        render(<DocControlsV2 {...getDefaults()} />);

        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Toggle thumbnails' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Toggle findbar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Rotate left' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Gallery view' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should keep page and zoom bounds disabled at their limits', () => {
        render(<DocControlsV2 {...getDefaults()} maxScale={1} minScale={1} pageNumber={1} />);

        expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    });

    test('should submit a new page number through the click-to-edit field', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<DocControlsV2 {...props} />);

        await user.click(screen.getByRole('button', { name: 'Click to enter page number' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Click to enter page number' }), {
            target: { value: '3' },
        });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Click to enter page number' }), { key: 'Enter' });

        expect(props.onPageSubmit).toHaveBeenCalledWith(3);
    });

    test('should toggle an annotation mode on and back off', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        const { rerender } = render(<DocControlsV2 {...props} hasHighlight />);

        // Annotation modes are exclusive, so Blueprint's toggle group renders them as radios rather
        // than the pressed buttons the legacy bar used.
        await user.click(screen.getByRole('radio', { name: 'Highlight and Comment' }));

        expect(props.onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.HIGHLIGHT });

        rerender(<DocControlsV2 {...props} annotationMode={AnnotationMode.HIGHLIGHT} hasHighlight />);

        // Guards the Tooltip/ToggleItem data-state clash: a wrapper keeps the tooltip from
        // overwriting the selected state that paints the active styling.
        expect(screen.getByRole('radio', { name: 'Highlight and Comment' })).toHaveAttribute('data-state', 'on');

        await user.click(screen.getByRole('radio', { name: 'Highlight and Comment' }));

        expect(props.onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
    });

    test('should pick a color from the swatches shown while drawing', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<DocControlsV2 {...props} annotationMode={AnnotationMode.DRAWING} hasDrawing />);

        const swatches = screen.getAllByTestId('bp-ColorPickerControl-swatch');
        await user.click(swatches[1]);

        expect(props.onAnnotationColorChange).toHaveBeenCalledWith(swatches[1].getAttribute('aria-label'));
    });

    test('should exit annotation mode on Escape', () => {
        const props = getDefaults();
        render(<DocControlsV2 {...props} annotationMode={AnnotationMode.HIGHLIGHT} hasHighlight />);

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(props.onAnnotationModeEscape).toHaveBeenCalled();
    });
});
