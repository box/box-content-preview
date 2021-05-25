import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import FullscreenToggle from '../../../controls/fullscreen';
import Image360Controls, { Props } from '../Image360Controls';
import VrToggleControl from '../../../controls/box3d/VrToggleControl';

describe('lib/viewers/box3d/image360/Image360Controls', () => {
    const getDefaults = (): Props => ({
        isVrShown: false,
        onFullscreenToggle: jest.fn(),
        onVrToggle: jest.fn(),
    });

    const getWrapper = (props: Partial<Props>): ShallowWrapper =>
        shallow(<Image360Controls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', () => {
            const onFullscreenToggle = jest.fn();
            const onVrToggle = jest.fn();

            const wrapper = getWrapper({
                onFullscreenToggle,
                onVrToggle,
            });

            expect(wrapper.find(VrToggleControl).props()).toMatchObject({
                isVrShown: false,
                onVrToggle,
            });
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onFullscreenToggle);
        });
    });
});
