import React from 'react';
import { act, render, screen } from '@testing-library/react';
import AnnotationsPaletteAnchorV2 from '../AnnotationsPaletteAnchorV2';
import { ControlsLayerContext } from '../../controls-layer';
import { PortalContainerContext } from '../../../../BlueprintProviders';

describe('AnnotationsPaletteAnchorV2', () => {
    let observe: jest.Mock;
    let disconnect: jest.Mock;
    let resizeCallback: () => void;

    beforeEach(() => {
        observe = jest.fn();
        disconnect = jest.fn();
        (global as unknown as { ResizeObserver: jest.Mock }).ResizeObserver = jest.fn(callback => {
            resizeCallback = callback;
            return { disconnect, observe, unobserve: jest.fn() };
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const setup = ({ setIsForced = jest.fn() } = {}) => {
        const containerEl = document.body.appendChild(document.createElement('div'));
        const anchorEl = document.body.appendChild(document.createElement('button'));
        const anchorRef = { current: anchorEl };

        jest.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50 } as DOMRect);
        const anchorRect = jest
            .spyOn(anchorEl, 'getBoundingClientRect')
            .mockReturnValue({ right: 700, top: 550 } as DOMRect);

        const result = render(
            <PortalContainerContext.Provider value={containerEl}>
                <ControlsLayerContext.Provider value={{ setIsForced }}>
                    <AnnotationsPaletteAnchorV2 anchorRef={anchorRef}>
                        <div data-testid="palette" />
                    </AnnotationsPaletteAnchorV2>
                </ControlsLayerContext.Provider>
            </PortalContainerContext.Provider>,
        );

        return { ...result, anchorRect, containerEl };
    };

    test('should portal its children into the container', () => {
        const { containerEl } = setup();

        expect(containerEl).toContainElement(screen.getByTestId('palette'));
    });

    test("should sit at the anchor's top-right corner relative to the container", () => {
        setup();

        expect(screen.getByTestId('bp-AnnotationsPaletteAnchorV2')).toHaveStyle({ left: '600px', top: '500px' });
    });

    test('should follow the anchor when the container resizes', () => {
        const { anchorRect, containerEl } = setup();

        expect(observe).toHaveBeenCalledWith(containerEl);

        anchorRect.mockReturnValue({ right: 500, top: 450 } as DOMRect);
        act(() => resizeCallback());

        expect(screen.getByTestId('bp-AnnotationsPaletteAnchorV2')).toHaveStyle({ left: '400px', top: '400px' });
    });

    test('should hold the controls layer open while mounted', () => {
        const setIsForced = jest.fn();
        const { unmount } = setup({ setIsForced });

        expect(setIsForced).toHaveBeenLastCalledWith(true);

        unmount();

        expect(setIsForced).toHaveBeenLastCalledWith(false);
        expect(disconnect).toHaveBeenCalled();
    });
});
