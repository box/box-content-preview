import classNames from 'classnames';
import React from 'react';
import IconShuttleForward from '../../controls/icons/IconShuttleForward';
import { replacePlaceholders } from '../../../util';
import './WaveformShuttleIndicator.scss';

export type ShuttleDirection = 'forward' | 'reverse';

type Props = {
    direction: ShuttleDirection;
    rate: number;
};

export default function WaveformShuttleIndicator({ direction, rate }: Props): JSX.Element {
    const isReverse = direction === 'reverse';
    const label = replacePlaceholders(isReverse ? __('media_shuttle_reverse') : __('media_shuttle_forward'), [
        String(rate),
    ]);

    return (
        <div
            aria-label={label}
            className={classNames('bp-WaveformShuttle', { 'bp-is-reverse': isReverse })}
            data-testid="bp-waveform-shuttle"
            role="status"
        >
            <IconShuttleForward aria-hidden="true" className="bp-WaveformShuttle-glyph" />
            <span className="bp-WaveformShuttle-rate">{`${rate}x`}</span>
        </div>
    );
}
