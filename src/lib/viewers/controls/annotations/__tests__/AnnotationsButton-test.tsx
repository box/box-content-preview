import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AnnotationsButton from '../AnnotationsButton';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsButton', () => {
    const getWrapper = (props = {}) =>
        render(
            <AnnotationsButton mode={AnnotationMode.REGION} onClick={jest.fn()} {...props}>
                Test
            </AnnotationsButton>,
        );

    describe('event handlers', () => {
        test('should call the onClick callback with the given mode', () => {
            const mode = AnnotationMode.HIGHLIGHT;
            const onClick = jest.fn();
            const wrapper = getWrapper({ mode, onClick });

            act(() => {
                wrapper.queryByText('Test')?.click();
            });

            expect(onClick).toHaveBeenCalledWith(mode);
        });
    });

    describe('render', () => {
        test('should return nothing if not enabled', () => {
            const wrapper = getWrapper({ isEnabled: false });

            expect(wrapper.container).toBeEmptyDOMElement();
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.container.getElementsByClassName('bp-AnnotationsButton').length).toBe(1);
            expect(wrapper.container.getElementsByClassName('bp-is-active').length).toBe(0); // Default
            expect(wrapper.container.textContent?.includes('Test')).toBe(true);
        });
    });
});
