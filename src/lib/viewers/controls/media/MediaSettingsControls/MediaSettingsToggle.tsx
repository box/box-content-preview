import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../../icons/IconGear24';
import MediaToggle from '../MediaToggle';
import './MediaSettingsToggle.scss';

export type Props = {
    isOpen: boolean;
    onClick: () => void;
};

export default function MediaSettingsToggle({ isOpen, onClick }: Props): JSX.Element {
    return (
        <MediaToggle
            className={classNames('bp-MediaSettingsToggle', { 'bp-is-open': isOpen })}
            onClick={onClick}
            title={__('media_settings')}
        >
            <IconGear24 className="bp-MediaSettingsToggle-icon" />
        </MediaToggle>
    );
}
