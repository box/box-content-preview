import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../../icons/IconGear24';
import './MediaSettingsToggle.scss';

export type Props = {
    isOpen: boolean;
    onClick: () => void;
};

export type Ref = HTMLButtonElement;

function MediaSettingsToggle({ isOpen, onClick }: Props, ref: React.Ref<Ref>): JSX.Element {
    return (
        <button
            ref={ref}
            className={classNames('bp-MediaSettingsToggle', { 'bp-is-open': isOpen })}
            onClick={onClick}
            title={__('media_settings')}
            type="button"
        >
            <IconGear24 className="bp-MediaSettingsToggle-icon" />
        </button>
    );
}

export default React.forwardRef(MediaSettingsToggle);
