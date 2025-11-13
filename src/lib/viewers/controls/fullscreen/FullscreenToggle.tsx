import React from 'react';
import classNames from 'classnames';
import IconFullscreenIn24 from '../icons/IconFullscreenIn24';
import IconFullscreenOut24 from '../icons/IconFullscreenOut24';
import IconArrowsMaximizeMedium24 from '../icons/IconArrowsMaximizeMedium24';
import IconArrowsMinimizeMedium24 from '../icons/IconArrowsMinimizeMedium24';
import useFullscreen from '../hooks/useFullscreen';
import './FullscreenToggle.scss';

export type Props = {
    modernizationEnabled?: boolean;
    onFullscreenToggle: (isFullscreen: boolean, toggleFullscreenEl: EventTarget | null) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export default function FullscreenToggle({
    modernizationEnabled = false,
    onFullscreenToggle,
    ...rest
}: Props): JSX.Element {
    const isFullscreen = useFullscreen();

    // Select icon based on modernization flag and fullscreen state
    let Icon;
    if (modernizationEnabled) {
        Icon = isFullscreen ? IconArrowsMinimizeMedium24 : IconArrowsMaximizeMedium24;
    } else {
        Icon = isFullscreen ? IconFullscreenOut24 : IconFullscreenIn24;
    }

    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = ({ target }: React.MouseEvent): void => {
        onFullscreenToggle(!isFullscreen, target);
    };

    return (
        <button
            className={classNames('bp-FullscreenToggle', {
                'bp-FullscreenToggle--modernized': modernizationEnabled,
            })}
            onClick={handleClick}
            title={title}
            type="button"
            {...rest}
        >
            <Icon />
        </button>
    );
}
