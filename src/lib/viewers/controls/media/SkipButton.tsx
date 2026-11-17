import React from 'react';
import { IconButton, Tooltip } from '@box/blueprint-web';
import { ArrowCurveBack5, ArrowCurveForward5 } from '@box/blueprint-web-assets/icons/Medium';
import IconBack24 from '../icons/IconArrowCurveBack24';
import IconForward24 from '../icons/IconArrowCurveForward24';
import MediaToggle from './MediaToggle';
import { stopActivationKeyPropagation } from './utils';
import { MEDIA_PLAYBACK_SKIP_DURATION } from '../../../constants';

export type Props = {
    className?: string;
    direction: 'backward' | 'forward';
    movePlayback: (isForward: boolean, duration: number) => void;
    isBlueprintEnabled?: boolean;
};

export default function SkipButton({
    className,
    direction,
    movePlayback,
    isBlueprintEnabled = false,
}: Props): JSX.Element {
    const isForward = direction === 'forward';
    const resinTarget = isForward ? 'skipForward' : 'skipBackward';
    const title = isForward ? __('media_skip_forward') : __('media_skip_backward');
    const handleClick = (): void => movePlayback(isForward, MEDIA_PLAYBACK_SKIP_DURATION);

    if (isBlueprintEnabled) {
        return (
            <Tooltip content={title}>
                <IconButton
                    aria-label={title}
                    data-resin-target={resinTarget}
                    data-target-id={`SkipButton-${resinTarget}`}
                    icon={isForward ? ArrowCurveForward5 : ArrowCurveBack5}
                    onClick={handleClick}
                    onKeyDown={stopActivationKeyPropagation}
                    size="large"
                    variant="on-dark"
                />
            </Tooltip>
        );
    }

    const Icon = isForward ? IconForward24 : IconBack24;

    return (
        <MediaToggle className={className} data-resin-target={resinTarget} onClick={handleClick} title={title}>
            <Icon />
        </MediaToggle>
    );
}
