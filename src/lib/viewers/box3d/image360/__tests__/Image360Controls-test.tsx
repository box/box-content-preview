import React from 'react';
import { render } from '@testing-library/react';

import Image360Controls, { Props } from '../Image360Controls';

describe('lib/viewers/box3d/image360/Image360Controls', () => {
    const getDefaults = (): Props => ({
        isVrShown: false,
        onFullscreenToggle: jest.fn(),
        onVrToggle: jest.fn(),
    });

    const getWrapper = (props: Partial<Props>) => render(<Image360Controls {...getDefaults()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const onFullscreenToggle = jest.fn();
            const onVrToggle = jest.fn();

            const wrapper = getWrapper({
                onFullscreenToggle,
                onVrToggle,
            });

            await expect(wrapper.queryByTitle('Toggle VR display')).toBe(null);

            await wrapper.queryByTitle('Enter fullscreen')?.click();
            await expect(onFullscreenToggle).toHaveBeenCalled();
        });
    });
});
