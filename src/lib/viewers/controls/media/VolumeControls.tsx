import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import IconVolumeMed24 from '../icons/IconVolumeMed24';
import IconVolumeLow24 from '../icons/IconVolumeLow24';
import IconVolumeMuted24 from '../icons/IconVolumeMuted24';
import MediaToggle from './MediaToggle';
import useAttention from '../hooks/useAttention';
import './VolumeControls.scss';
import IconVolumeMax24 from '../icons/IconVolumeMax24';
import VolumeSliderControl from '../slider/VolumeSliderControl';

/** Keyboard volume keeps the flyout open longer than the 200ms max-width transition. */
export const VOLUME_FLYOUT_DISMISS_MS = 1000;

export type Props = {
    /** Bump counter from keyboard volume. 0 means no keyboard reveal; each increment re-opens the flyout. */
    keyboardVolumeStep?: number;
    onMuteChange: (isMuted: boolean) => void;
    onVolumeChange: (volume: number) => void;
    volume?: number;
};

export function getIcon(volume: number): (props: React.SVGProps<SVGSVGElement>) => JSX.Element {
    let Icon = IconVolumeMuted24;

    if (volume >= 0.66) {
        Icon = IconVolumeMax24;
    } else if (volume >= 0.33) {
        Icon = IconVolumeMed24;
    } else if (volume >= 0.01) {
        Icon = IconVolumeLow24;
    }

    return Icon;
}

export default function VolumeControls({
    keyboardVolumeStep = 0,
    onMuteChange,
    onVolumeChange,
    volume = 1,
}: Props): JSX.Element {
    const [isActive, handlers] = useAttention();
    const [isRevealed, setIsRevealed] = useState(false);
    const revealTimerRef = useRef(0);
    const isMuted = !volume;
    const Icon = isMuted ? IconVolumeMuted24 : getIcon(volume);
    const title = isMuted ? __('media_unmute') : __('media_mute');
    const value = Math.round(volume * 100);
    const isOpen = isActive || isRevealed;

    useEffect(() => {
        if (!keyboardVolumeStep) {
            return;
        }
        setIsRevealed(true);
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = window.setTimeout(() => {
            setIsRevealed(false);
            revealTimerRef.current = 0;
        }, VOLUME_FLYOUT_DISMISS_MS);
    }, [keyboardVolumeStep]);

    useEffect(() => () => window.clearTimeout(revealTimerRef.current), []);

    const handleVolume = useCallback(
        (newValue: number): void => {
            const newValueToUse = newValue <= 5 ? 0 : newValue;
            // make sure the value is always between 0 and 1 since the value passed in could be
            // greater than 100 if the user drags the mouse above the top of the sider when adjusting the volume
            const volumeToUse = Math.min(1, newValueToUse / 100);
            onVolumeChange(volumeToUse);
        },
        [onVolumeChange],
    );

    return (
        <div
            className="bp-VolumeControls"
            data-testid="bp-volume-controls"
            onBlur={event => {
                handlers.onBlur(event);
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    return;
                }
                window.clearTimeout(revealTimerRef.current);
                revealTimerRef.current = 0;
                setIsRevealed(false);
            }}
            onFocus={handlers.onFocus}
            onMouseOut={handlers.onMouseOut}
            onMouseOver={handlers.onMouseOver}
        >
            <MediaToggle
                className="bp-VolumeControls-toggle"
                data-resin-target="volumeToggle"
                onClick={(): void => onMuteChange(!isMuted)}
                title={title}
            >
                <Icon />
            </MediaToggle>
            <div aria-hidden={!isOpen} className={classNames('bp-VolumeControls-flyout', { 'bp-is-open': isOpen })}>
                <VolumeSliderControl
                    aria-hidden={!isOpen}
                    className="bp-VolumeControls-slider"
                    max={100}
                    onMouseOver={handlers.onMouseOver}
                    onUpdate={handleVolume}
                    step={1}
                    tabIndex={isOpen ? 0 : -1}
                    title={__('media_volume_slider')}
                    value={value}
                />
            </div>
        </div>
    );
}
