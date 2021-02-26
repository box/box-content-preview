import React from 'react';
import { decodeKeydown } from '../../../util';

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function MediaToggle(props: Props): JSX.Element {
    const handleKeydown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Enter' || key === 'Space') {
            event.stopPropagation();
        }
    };

    return <button onKeyDown={handleKeydown} type="button" {...props} />;
}
