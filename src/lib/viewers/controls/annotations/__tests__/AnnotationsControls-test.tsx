import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactWrapper, mount } from 'enzyme';
import AnnotationsControls from '../AnnotationsControls';
import { AnnotationColor } from '../../../../AnnotationModule';
import { AnnotationMode } from '../types';

describe('AnnotationsControls', () => {
    const getWrapper = (props = {}): ReactWrapper =>
        mount(<AnnotationsControls annotationColor={AnnotationColor.BLUE} {...props} />);
    const getElement = (props = {}): ReactWrapper => getWrapper(props).childAt(0);

    beforeEach(() => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
    });

    describe('lifecycle', () => {
        test('should add and remove its event handlers on mount and unmount', () => {
            const wrapper = getWrapper({
                annotationMode: AnnotationMode.REGION,
                hasHighlight: true,
                hasRegion: true,
            });
            expect(document.addEventListener).toBeCalledWith('keydown', expect.any(Function));

            wrapper.unmount();
            expect(document.removeEventListener).toBeCalledWith('keydown', expect.any(Function));
        });

        test('should not add a handler if the annotation mode is set to none', () => {
            const wrapper = getWrapper({ hasHighlight: true, hasRegion: true });
            expect(document.addEventListener).not.toBeCalledWith('keydown', expect.any(Function));

            wrapper.unmount();
            expect(document.removeEventListener).toBeCalledWith('keydown', expect.any(Function));
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

            element.find(`button[data-testid="${selector}"]`).simulate('click');

            expect(onClick).toBeCalledWith({ mode: result });
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

            expect(onEscape).toBeCalled();
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

            expect(onEscape).not.toBeCalled();
        });
    });

    describe('render', () => {
        test('should return nothing if no mode is enabled', () => {
            const wrapper = getWrapper();

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return a valid wrapper', () => {
            const element = getElement({ hasHighlight: true, hasRegion: true });

            expect(element.hasClass('bp-AnnotationsControls')).toBe(true);
        });
    });
});
