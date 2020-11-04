import React from 'react';
import { shallow } from 'enzyme';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle from '../../controls/fullscreen';
import MarkdownControls from '../MarkdownControls';

describe('MarkdownControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onToggle = jest.fn();
            const wrapper = shallow(<MarkdownControls onFullscreenToggle={onToggle} />);

            expect(wrapper.exists(ControlsBar));
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onToggle);
        });
    });
});
