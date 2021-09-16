import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconThumbnailsToggle24 from '../../icons/IconThumbnailsToggle24';
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
            expect(wrapper.exists(IconThumbnailsToggle24)).toBe(true);
        });

        test('should return an empty wrapper if no callback is defined', () => {
            const wrapper = getWrapper();

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should have a property aria-expanded setted to false', () => {
            const wrapper = getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen: false });
            expect(wrapper.prop('aria-expanded')).toBe(false);
        });

        test('should have a property aria-expanded setted to true', () => {
            const wrapper = getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen: true });
            expect(wrapper.prop('aria-expanded')).toBe(true);
        });
    });
});
