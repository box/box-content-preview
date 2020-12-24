import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconThumbnailsToggle18 from '../../icons/IconThumbnailsToggle18';
import ThumbnailsToggle from '../ThumbnailsToggle';

describe('ThumbnailsToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<ThumbnailsToggle {...props} />);

    describe('event handlers', () => {
        test('should forward the click from the button', () => {
            const onToggle = jest.fn();
            const wrapper = getWrapper({ onThumbnailsToggle: onToggle });

            wrapper.simulate('click');

            expect(onToggle).toBeCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(wrapper.hasClass('bp-ThumbnailsToggle')).toBe(true);
            expect(wrapper.exists(IconThumbnailsToggle18)).toBe(true);
        });

        test('should return an empty wrapper if no callback is defined', () => {
            const wrapper = getWrapper();

            expect(wrapper.isEmptyRender()).toBe(true);
        });
    });
});
