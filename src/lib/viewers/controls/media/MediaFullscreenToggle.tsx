import React from 'react';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../fullscreen';
import { decodeKeydown } from '../../../util';

export type Props = FullscreenToggleProps;

export default function MediaFullscreenToggle(props: Props): JSX.Element {
    const handleKeydown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Enter' || key === 'Space') {
            event.stopPropagation();
        }
    };

    return <FullscreenToggle onKeyDown={handleKeydown} {...props} />;
}
