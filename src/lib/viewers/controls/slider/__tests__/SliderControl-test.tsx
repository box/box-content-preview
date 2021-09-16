import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import SliderControl from '../SliderControl';

describe('SliderControl', () => {
    const getWrapper = (props = {}): ReactWrapper =>
        mount(<SliderControl max={100} min={0} onChange={jest.fn()} step={1} title="Slider" value={0} {...props} />);

    beforeEach(() => {
        jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
            (): DOMRect => ({
                bottom: 0,
                height: 50,
                left: 0, // Values are reduced by the left offset of the slider
                right: 0,
                top: 0,
                toJSON: jest.fn(),
                width: 1000, // Values are calculated based on width of the slider
                x: 0,
                y: 0,
            }),
        );
    });

    describe('event handlers', () => {
        test.each`
            pageX   | result
            ${-50}  | ${0}
            ${0}    | ${0}
            ${50}   | ${5}
            ${999}  | ${99.9}
            ${1500} | ${100}
        `('should handle mousedown and update the value for pageX value $pageX', ({ pageX, result }) => {
            const event = { button: 1, pageX };
            const onUpdate = jest.fn();
            const wrapper = getWrapper({ onUpdate, value: 0 });

            act(() => {
                wrapper.simulate('mousedown', event);
            });
            wrapper.update();

            expect(onUpdate).toBeCalledWith(result);
        });

        test('should handle mousemove by calling onMove with the value, position, and width', () => {
            const event = { pageX: 100 };
            const onMove = jest.fn();
            const wrapper = getWrapper({ onMove });

            act(() => {
                wrapper.simulate('mousemove', event);
            });
            wrapper.update();

            expect(onMove).toBeCalledWith(10, 100, 1000); // Value, position, width
        });

        test.each`
            initial | result
            ${0}    | ${0}
            ${10}   | ${9}
            ${100}  | ${99}
        `('should handle keydown and decrement the value $initial to $result ', ({ initial, result }) => {
            const event = { key: 'ArrowLeft', stopPropagation: jest.fn() };
            const onUpdate = jest.fn();
            const wrapper = getWrapper({ onUpdate, value: initial });

            act(() => {
                wrapper.simulate('keydown', event);
            });
            wrapper.update();

            expect(event.stopPropagation).toBeCalled();
            expect(onUpdate).toBeCalledWith(result);
        });

        test.each`
            initial | result
            ${0}    | ${1}
            ${10}   | ${11}
            ${100}  | ${100}
        `('should handle keydown and increment the value $initial to $result ', ({ initial, result }) => {
            const event = { key: 'ArrowRight', stopPropagation: jest.fn() };
            const onUpdate = jest.fn();
            const wrapper = getWrapper({ onUpdate, value: initial });

            wrapper.simulate('keydown', event);

            expect(event.stopPropagation).toBeCalled();
            expect(onUpdate).toBeCalledWith(result);
        });
    });

    describe('effects', () => {
        beforeEach(() => {
            jest.spyOn(document, 'addEventListener');
            jest.spyOn(document, 'removeEventListener');
        });

        test('should add document-level event handlers when scrubbing starts', () => {
            const wrapper = getWrapper();

            act(() => {
                wrapper.simulate('mousedown', { button: 1 });
            });
            wrapper.update();

            expect(document.addEventListener).toBeCalledWith('mousemove', expect.any(Function));
            expect(document.addEventListener).toBeCalledWith('mouseup', expect.any(Function));
            expect(document.addEventListener).toBeCalledWith('touchend', expect.any(Function));
            expect(document.addEventListener).toBeCalledWith('touchmove', expect.any(Function));
        });

        test('should remove document-level event handlers when scrubbing stops', () => {
            const wrapper = getWrapper();

            act(() => {
                wrapper.simulate('mousedown', { button: 1 });
            });
            wrapper.update();

            act(() => {
                document.dispatchEvent(new Event('mouseup'));
            });
            wrapper.update();

            expect(document.removeEventListener).toBeCalledWith('mousemove', expect.any(Function));
            expect(document.removeEventListener).toBeCalledWith('mouseup', expect.any(Function));
            expect(document.removeEventListener).toBeCalledWith('touchend', expect.any(Function));
            expect(document.removeEventListener).toBeCalledWith('touchmove', expect.any(Function));
        });

        test('should handle document-level mousemove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            const wrapper = getWrapper({ onUpdate });

            act(() => {
                wrapper.simulate('mousedown', { button: 1 });
            });
            wrapper.update();

            act(() => {
                const event = new MouseEvent('mousemove');
                Object.assign(event, { pageX: 100 });
                document.dispatchEvent(event);
            });
            wrapper.update();

            expect(onUpdate).toBeCalledWith(10);
        });

        test('should handle document-level touchmove events and call onUpdate', () => {
            const onUpdate = jest.fn();
            const wrapper = getWrapper({ onUpdate });

            act(() => {
                wrapper.simulate('touchstart', { touches: [{ pageX: 0 }] });
            });
            wrapper.update();

            act(() => {
                const event = new MouseEvent('touchmove');
                Object.assign(event, { touches: [{ pageX: 100 }] });
                document.dispatchEvent(event);
            });
            wrapper.update();

            expect(onUpdate).toBeCalledWith(10);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.childAt(0).hasClass('bp-SliderControl')).toBe(true);
            expect(wrapper.find('[data-testid="bp-SliderControl-thumb"]').prop('style')).toEqual({
                left: '0%',
            });
        });

        test('should forward the track and value properties properly', () => {
            const track = 'linear-gradient(#fff %20, #000 100%';
            const wrapper = getWrapper({ track, value: 20 });

            expect(wrapper.find('[data-testid="bp-SliderControl-thumb"]').prop('style')).toEqual({
                left: '20%',
            });
            expect(wrapper.find('[data-testid="bp-SliderControl-track"]').prop('style')).toEqual({
                backgroundImage: track,
            });
        });
    });
});
