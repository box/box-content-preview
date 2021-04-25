import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import noop from 'lodash/noop';
import AnnotationsButton from '../AnnotationsButton';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsButton', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <AnnotationsButton mode={AnnotationMode.REGION} onClick={jest.fn()} {...props}>
                Test
            </AnnotationsButton>,
        );

    describe('event handlers', () => {
        test('should call the onClick callback with the given mode', () => {
            const mode = AnnotationMode.HIGHLIGHT;
            const onClick = jest.fn();
            const wrapper = getWrapper({ mode, onClick });

            wrapper.children().simulate('click');

            expect(onClick).toBeCalledWith(mode);
        });
    });

    describe('render', () => {
        test('should return nothing if not enabled', () => {
            const wrapper = getWrapper({ isEnabled: false });
            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('preview-annotations-tooltip')).toBe(true);
            expect(wrapper.prop('shouldTarget')).toBe(false);
            expect(wrapper.children().hasClass('bp-AnnotationsButton')).toBe(true);
            expect(wrapper.children().hasClass('bp-is-active')).toBe(false); // Default
            expect(wrapper.children().text()).toBe('Test');
        });

        test('should target tooltip if can show', () => {
            const wrapper = getWrapper({
                tooltipFlowAnnotationsExperience: {
                    canShow: true,
                    onClose: noop,
                    onComplete: noop,
                    onShow: noop,
                },
            });

            expect(wrapper.hasClass('preview-annotations-tooltip')).toBe(true);
            expect(wrapper.prop('shouldTarget')).toBe(true);
        });
    });
});
