import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DocControlsV2 from '../DocControlsV2';
import { AnnotationMode } from '../../../types';
import { Props } from '../DocControls';

describe('DocControlsV2', () => {
    // The viewer owns the annotation mode and hands it back down, so a test that clicks its way
    // through the palette has to close the same loop.
    function ControlledDocControls({ annotationMode: initialMode, onAnnotationModeClick, ...props }: Props) {
        const [annotationMode, setAnnotationMode] = React.useState(initialMode);

        const handleAnnotationModeClick = ({ mode }: { mode: AnnotationMode }): void => {
            setAnnotationMode(mode);

            if (onAnnotationModeClick) {
                onAnnotationModeClick({ mode });
            }
        };

        return (
            <DocControlsV2
                {...props}
                annotationMode={annotationMode}
                onAnnotationModeClick={handleAnnotationModeClick}
            />
        );
    }

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

    // The bar only collapses controls when it knows how much room it has, which jsdom never reports
    // on its own.
    const mockViewerWidth = (width: number): void => {
        window.ResizeObserver = jest.fn().mockImplementation(callback => {
            callback([{ contentRect: { width } }]);

            return { disconnect: jest.fn(), observe: jest.fn(), unobserve: jest.fn() };
        });
    };

    afterEach(() => {
        // @ts-expect-error jsdom has no ResizeObserver to restore it to
        delete window.ResizeObserver;
    });

    test('should render every document control that stays on the bar', () => {
        render(<DocControlsV2 {...getDefaults()} />);

        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Toggle thumbnails' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Rotate left' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should reach find and gallery through the overflow menu', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<DocControlsV2 {...props} />);

        // Find and gallery sit in the menu at every width in the mocks, so they are never buttons.
        expect(screen.queryByRole('button', { name: 'Toggle findbar' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'More options' }));

        expect(screen.getByRole('menuitem', { name: 'Toggle findbar' })).toBeInTheDocument();

        await user.click(screen.getByRole('menuitem', { name: 'Gallery view' }));

        expect(props.onGalleryToggle).toHaveBeenCalled();
    });

    test('should collapse controls into the menu as the viewer narrows', async () => {
        const user = userEvent.setup();
        mockViewerWidth(200);
        render(<DocControlsV2 {...getDefaults()} hasRegion />);

        // Page and markup are pinned, zoom outranks the rest, and everything below it collapses.
        expect(screen.getByRole('button', { name: 'Click to enter page number' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Comment and markup' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Rotate left' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Toggle thumbnails' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'More options' }));

        expect(screen.getByRole('menuitem', { name: 'Rotate left' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Toggle thumbnails' })).toBeInTheDocument();
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

    test('should open the markup palette on a mode rather than on nothing', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<ControlledDocControls {...props} hasDrawing hasHighlight hasRegion />);

        expect(screen.queryByRole('radio', { name: 'Comment on Region' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Comment and markup' }));

        // Annotation modes are exclusive, so Blueprint's toggle group renders them as radios rather
        // than the pressed buttons the legacy bar used.
        expect(props.onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
        expect(screen.getByRole('radio', { name: 'Comment on Region' })).toHaveAttribute('data-state', 'on');
        expect(screen.getByRole('radio', { name: 'Markup' })).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Highlight and Comment' }));

        expect(props.onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.HIGHLIGHT });
    });

    test('should show the selected mode as active in the palette', () => {
        render(<DocControlsV2 {...getDefaults()} annotationMode={AnnotationMode.HIGHLIGHT} hasHighlight />);

        // Guards the Tooltip/ToggleItem data-state clash: a wrapper keeps the tooltip from
        // overwriting the selected state that paints the active styling.
        expect(screen.getByRole('radio', { name: 'Highlight and Comment' })).toHaveAttribute('data-state', 'on');
    });

    test('should close the palette when the mode it is on is turned off', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<ControlledDocControls {...props} annotationMode={AnnotationMode.HIGHLIGHT} hasHighlight />);

        await user.click(screen.getByRole('radio', { name: 'Highlight and Comment' }));

        expect(props.onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
        expect(screen.queryByRole('radio', { name: 'Highlight and Comment' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Comment and markup' })).toHaveAttribute('data-state', 'off');
    });

    test('should reopen the palette on the mode it was left on', async () => {
        const user = userEvent.setup();
        const props = getDefaults();
        render(<ControlledDocControls {...props} annotationMode={AnnotationMode.HIGHLIGHT} hasHighlight hasRegion />);

        const toggle = screen.getByRole('button', { name: 'Comment and markup' });
        await user.click(toggle);

        expect(screen.queryByRole('radio', { name: 'Highlight and Comment' })).not.toBeInTheDocument();

        await user.click(toggle);

        expect(screen.getByRole('radio', { name: 'Highlight and Comment' })).toHaveAttribute('data-state', 'on');
    });

    test('should follow the viewer into a mode the user started without the palette', () => {
        const props = getDefaults();
        const { rerender } = render(<DocControlsV2 {...props} hasHighlight hasRegion />);

        expect(screen.queryByRole('radio', { name: 'Comment on Region' })).not.toBeInTheDocument();

        // Dragging a region or selecting text with no mode picked puts the viewer into that mode on
        // its own, and the bar has to follow it rather than claim nothing is on.
        rerender(<DocControlsV2 {...props} annotationMode={AnnotationMode.REGION} hasHighlight hasRegion />);

        expect(screen.getByRole('button', { name: 'Comment and markup' })).toHaveAttribute('data-state', 'on');
        expect(screen.getByRole('radio', { name: 'Comment on Region' })).toHaveAttribute('data-state', 'on');
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
