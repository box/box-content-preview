import React from 'react';
import { act } from 'react-dom/test-utils';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { render, within } from '@testing-library/react';
import AnnotationsControls from '../AnnotationsControls';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsControls', () => {
    const getWrapper = (props = {}) => {
        const parentEl = document.createElement('div');
        document.body.appendChild(parentEl);
        return render(<AnnotationsControls {...props} />, { container: parentEl });
    };
    const getElement = (props = {}) => getWrapper(props);

    beforeEach(() => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
    });

    describe('lifecycle', () => {
        let unmount = (): void => {
            // placeholder
        };

        beforeEach(() => {
            let found = false; // we want to find the first use of useEffect
            jest.spyOn(React, 'useEffect').mockImplementation(cb => {
                if (!found) {
                    found = true;
                    unmount = cb() as () => void; // Enzyme unmount helper does not currently invoke useEffect cleanup
                }
            });
        });

        test('should add and remove its event handlers on mount and unmount', () => {
            getWrapper({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
            });
            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            getWrapper({ hasHighlight: true, hasRegion: true });
            expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));

            unmount();
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('event handlers', () => {
        test.each`
            current                   | selector                                 | result
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-regionBtn'}    | ${AnnotationMode.REGION}
            ${AnnotationMode.REGION}  | ${'bp-AnnotationsControls-regionBtn'}    | ${AnnotationMode.NONE}
            ${AnnotationMode.REGION}  | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-highlightBtn'} | ${AnnotationMode.HIGHLIGHT}
            ${AnnotationMode.NONE}    | ${'bp-AnnotationsControls-drawBtn'}      | ${AnnotationMode.DRAWING}
            ${AnnotationMode.DRAWING} | ${'bp-AnnotationsControls-drawBtn'}      | ${AnnotationMode.NONE}
        `('in $current mode returns $result when $selector is clicked', ({ current, result, selector }) => {
            const onClick = jest.fn();
            const element = getElement({
                annotationMode: current,
                hasDrawing: true,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeClick: onClick,
            });

            act(() => {
                element.queryByTestId(selector)?.click();
            });

            expect(onClick).toHaveBeenCalledWith({ mode: result });
        });

        test('should invoke the escape callback if the escape key is pressed while in a mode', () => {
            const onEscape = jest.fn();

            getWrapper({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeEscape: onEscape,
            });

            act(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            });

            expect(onEscape).toHaveBeenCalled();
        });

        test('should not invoke the escape callback if any key other than escape is pressed', () => {
            const onEscape = jest.fn();

            getWrapper({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
                onAnnotationModeEscape: onEscape,
            });

            act(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            });

            expect(onEscape).not.toHaveBeenCalled();
        });

        test.each`
            current                     | selector
            ${AnnotationMode.REGION}    | ${'bp-AnnotationsControls-regionBtn'}
            ${AnnotationMode.HIGHLIGHT} | ${'bp-AnnotationsControls-highlightBtn'}
            ${AnnotationMode.DRAWING}   | ${'bp-AnnotationsControls-drawBtn'}
        `(
            'while in $current mode, should focus on $current button when exit button is clicked',
            ({ current, selector }) => {
                const wrapper = getWrapper({
                    annotationMode: current,
                    hasDrawing: true,
                    hasHighlight: true,
                    hasRegion: true,
                });

                act(() => {
                    wrapper.queryByTestId('bp-AnnotationsControls-exitBtn')?.click();
                });

                expect(wrapper.queryByTestId(selector) === document.activeElement).toBe(true);
            },
        );
    });

    describe('render', () => {
        test('should return nothing if no mode is enabled', () => {
            const wrapper = getWrapper();

            expect(wrapper.container).toBeEmptyDOMElement();
        });

        test('should return a valid wrapper', () => {
            const element = getElement({ hasHighlight: true, hasRegion: true });

            expect(element.container.getElementsByClassName('bp-AnnotationsControls').length).toBe(1);
        });

        test.each`
            fill          | mode
            ${bdlBoxBlue} | ${AnnotationMode.DRAWING}
            ${'#fff'}     | ${AnnotationMode.NONE}
        `('should return an IconDrawing24 with the fill set as $fill if annotationMode is $mode', ({ fill, mode }) => {
            const wrapper = getWrapper({ annotationMode: mode, hasDrawing: true });

            const icon = wrapper.getByTitle('Markup').querySelector('svg');

            expect(icon?.children[0]).toHaveAttribute('fill', fill);
        });
    });
});
