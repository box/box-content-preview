import React from 'react';
import { shallow } from 'enzyme';
import MP3Controls from '../MP3Controls';
import PlayPauseToggle from '../../controls/media/PlayPauseToggle';
import TimeControls from '../../controls/media/TimeControls';
import VolumeControls from '../../controls/media/VolumeControls';

describe('MP3Controls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onMuteChange = jest.fn();
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            const onVolumeChange = jest.fn();
            const wrapper = shallow(
                <MP3Controls
                    onMuteChange={onMuteChange}
                    onPlayPause={onPlayPause}
                    onTimeChange={onTimeChange}
                    onVolumeChange={onVolumeChange}
                />,
            );

            expect(wrapper.hasClass('bp-MP3Controls')).toBe(true);
            expect(wrapper.find(PlayPauseToggle).prop('onPlayPause')).toEqual(onPlayPause);
            expect(wrapper.find(TimeControls).prop('onTimeChange')).toEqual(onTimeChange);
            expect(wrapper.find(VolumeControls).prop('onMuteChange')).toEqual(onMuteChange);
            expect(wrapper.find(VolumeControls).prop('onVolumeChange')).toEqual(onVolumeChange);
        });
    });
});
