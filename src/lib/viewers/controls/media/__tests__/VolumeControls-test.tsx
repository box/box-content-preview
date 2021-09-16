import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconVolumeHigh24 from '../../icons/IconVolumeHigh24';
import IconVolumeLow24 from '../../icons/IconVolumeLow24';
import IconVolumeMedium24 from '../../icons/IconVolumeMedium24';
import IconVolumeMute24 from '../../icons/IconVolumeMute24';
import MediaToggle from '../MediaToggle';
import SliderControl from '../../slider';
import VolumeControls from '../VolumeControls';

jest.mock('../../slider');

describe('VolumeControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<VolumeControls onMuteChange={jest.fn()} onVolumeChange={jest.fn()} {...props} />);

    describe('event handlers', () => {
        test.each`
            volume | isMuted
            ${0}   | ${false}
            ${0.5} | ${true}
            ${1}   | ${true}
        `('should toggle mute to $isMuted when volume is $volume', ({ isMuted, volume }) => {
            const onMuteChange = jest.fn();
            const wrapper = getWrapper({ onMuteChange, volume });
            const toggle = wrapper.find(MediaToggle);

            toggle.simulate('click');
            expect(onMuteChange).toBeCalledWith(isMuted);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-VolumeControls')).toBe(true);
        });

        test.each`
            volume  | icon                  | title
            ${0}    | ${IconVolumeMute24}   | ${'Unmute'}
            ${0.0}  | ${IconVolumeMute24}   | ${'Unmute'}
            ${0.01} | ${IconVolumeLow24}    | ${'Mute'}
            ${0.25} | ${IconVolumeLow24}    | ${'Mute'}
            ${0.33} | ${IconVolumeMedium24} | ${'Mute'}
            ${0.51} | ${IconVolumeMedium24} | ${'Mute'}
            ${0.66} | ${IconVolumeHigh24}   | ${'Mute'}
            ${1.0}  | ${IconVolumeHigh24}   | ${'Mute'}
        `('should render the correct icon and title for volume $volume', ({ icon, title, volume }) => {
            const wrapper = getWrapper({ volume });

            expect(wrapper.exists(icon)).toBe(true);
            expect(wrapper.find(MediaToggle).prop('title')).toBe(title);
        });

        test.each`
            volume   | track                                                   | value
            ${0}     | ${`linear-gradient(to right, #0061d5 0%, #fff 0%)`}     | ${0}
            ${0.0}   | ${`linear-gradient(to right, #0061d5 0%, #fff 0%)`}     | ${0}
            ${0.01}  | ${`linear-gradient(to right, #0061d5 1%, #fff 1%)`}     | ${1}
            ${0.25}  | ${`linear-gradient(to right, #0061d5 25%, #fff 25%)`}   | ${25}
            ${0.254} | ${`linear-gradient(to right, #0061d5 25%, #fff 25%)`}   | ${25}
            ${0.255} | ${`linear-gradient(to right, #0061d5 26%, #fff 26%)`}   | ${26}
            ${1.0}   | ${`linear-gradient(to right, #0061d5 100%, #fff 100%)`} | ${100}
        `('should render the correct track and value for volume $volume', ({ track, value, volume }) => {
            const wrapper = getWrapper({ volume });

            expect(wrapper.find(SliderControl).props()).toMatchObject({
                track,
                value,
            });
        });
    });
});
