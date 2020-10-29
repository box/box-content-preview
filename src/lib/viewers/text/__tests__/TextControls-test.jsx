import React from 'react';
import { shallow } from 'enzyme';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle from '../../controls/fullscreen';
import TextControls from '../TextControls';
import ZoomControls from '../../controls/zoom';

describe('TextControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onToggle = jest.fn();
            const onZoomIn = jest.fn();
            const onZoomOut = jest.fn();
            const wrapper = shallow(
                <TextControls onFullscreenToggle={onToggle} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />,
            );

            expect(wrapper.exists(ControlsBar));
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onToggle);
            expect(wrapper.find(ZoomControls).prop('onZoomIn')).toEqual(onZoomIn);
            expect(wrapper.find(ZoomControls).prop('onZoomOut')).toEqual(onZoomOut);
        });
    });
});
