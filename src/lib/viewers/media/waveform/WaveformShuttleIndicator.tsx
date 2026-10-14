import classNames from 'classnames';
import React from 'react';
import { Text } from '@box/blueprint-web';
import IconShuttleForward from '../../controls/icons/IconShuttleForward';
import { replacePlaceholders } from '../../../util';
import { ShuttleDirection } from './types';
import './WaveformShuttleIndicator.scss';

type Props = {
    direction: ShuttleDirection;
    isBlueprintEnabled?: boolean;
    rate: number;
};

export default function WaveformShuttleIndicator({ direction, isBlueprintEnabled = false, rate }: Props): JSX.Element {
    const isReverse = direction === 'reverse';
    const rateLabel = `${rate}x`;
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
            <span className="bp-WaveformShuttle-rate">
                {isBlueprintEnabled ? (
                    <Text as="span" color="textOnDarkDefault" variant="bodyDefaultSemibold">
                        {rateLabel}
                    </Text>
                ) : (
                    rateLabel
                )}
            </span>
        </div>
    );
}
