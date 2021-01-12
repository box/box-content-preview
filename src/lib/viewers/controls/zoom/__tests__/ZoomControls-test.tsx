import React from 'react';
import noop from 'lodash/noop';
import { shallow, ShallowWrapper } from 'enzyme';
import ZoomControls from '../ZoomControls';

describe('ZoomControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<ZoomControls onZoomIn={noop} onZoomOut={noop} {...props} />);
    const getZoom = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-ZoomControls-current"]');
    const getZoomIn = (wrapper: ShallowWrapper): ShallowWrapper => wrapper.find('[data-testid="bp-ZoomControls-in"]');
    const getZoomOut = (wrapper: ShallowWrapper): ShallowWrapper => wrapper.find('[data-testid="bp-ZoomControls-out"]');

    describe('event handlers', () => {
        test('should handle zoom in click', () => {
            const onZoomIn = jest.fn();
            const wrapper = getWrapper({ onZoomIn });

            getZoomIn(wrapper).simulate('click');

            expect(onZoomIn).toBeCalled();
        });

        test('should handle zoom out click', () => {
            const onZoomOut = jest.fn();
            const wrapper = getWrapper({ onZoomOut });

            getZoomOut(wrapper).simulate('click');

            expect(onZoomOut).toBeCalled();
        });
    });

    describe('render', () => {
        test.each`
            minScale | scale     | disabled
            ${null}  | ${1}      | ${false}
            ${0.5}   | ${1}      | ${false}
            ${0.5}   | ${0.5005} | ${true}
            ${0.5}   | ${0.5}    | ${true}
            ${-50}   | ${0.1}    | ${true}
            ${-50}   | ${0.2}    | ${false}
        `('should set disabled for zoom out to $disabled for $scale / $minScale', ({ disabled, minScale, scale }) => {
            const wrapper = getWrapper({ minScale, scale });

            expect(getZoomOut(wrapper).prop('disabled')).toBe(disabled);
        });

        test.each`
            maxScale | scale      | disabled
            ${null}  | ${1}       | ${false}
            ${10}    | ${1}       | ${false}
            ${50}    | ${49.9999} | ${true}
            ${50}    | ${50}      | ${true}
            ${500}   | ${100}     | ${true}
            ${500}   | ${99}      | ${false}
        `('should set disabled for zoom in to $disabled for $scale / $maxScale', ({ disabled, maxScale, scale }) => {
            const wrapper = getWrapper({ maxScale, scale });

            expect(getZoomIn(wrapper).prop('disabled')).toBe(disabled);
        });

        test.each`
            scale    | zoom
            ${1}     | ${'100%'}
            ${1.49}  | ${'149%'}
            ${1.499} | ${'150%'}
            ${10}    | ${'1000%'}
            ${100}   | ${'10000%'}
        `('should format $scale to $zoom properly', ({ scale, zoom }) => {
            const wrapper = getWrapper({ scale });

            expect(getZoom(wrapper).text()).toEqual(zoom);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(getZoom(wrapper)).toBeDefined();
            expect(getZoomIn(wrapper)).toBeDefined();
            expect(getZoomOut(wrapper)).toBeDefined();
            expect(wrapper.hasClass('bp-ZoomControls')).toBe(true);
        });
    });
});
