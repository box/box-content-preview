import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AnimationControls, { Props as AnimationControlsProps } from '../AnimationControls';

describe('AnimationControls', () => {
    const getDefaults = (): AnimationControlsProps => ({
        animationClips: [{ duration: 1, id: '1', name: 'one' }],
        currentAnimationClipId: '1',
        isPlaying: false,
        onAnimationClipSelect: jest.fn(),
        onPlayPause: jest.fn(),
    });
    const getWrapper = (props = {}) => render(<AnimationControls {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should return null if animationClips is empty', () => {
            const wrapper = getWrapper({ animationClips: [] });

            expect(wrapper.container).toBeEmptyDOMElement();
        });

        test('should return valid wrapper', () => {
            const onAnimationClipSelect = jest.fn();
            const onPlayPause = jest.fn();
            const wrapper = getWrapper({ onAnimationClipSelect, onPlayPause });

            act(() => wrapper.queryByTitle('Play')?.click());
            expect(onPlayPause).toHaveBeenCalledWith(true);

            act(() => wrapper.queryByTitle('Animation clips')?.click());
            act(() =>
                wrapper
                    .getAllByRole('menuitemradio')
                    ?.at(0)
                    ?.click(),
            );
            expect(onAnimationClipSelect).toHaveBeenCalledWith('1');
        });
    });
});
