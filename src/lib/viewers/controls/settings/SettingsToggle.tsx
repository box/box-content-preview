import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../icons/IconGear24';
import './SettingsToggle.scss';

export type Props = {
    badge?: React.ReactElement;
    isOpen: boolean;
    onClick: () => void;
};

export type Ref = HTMLButtonElement;

function SettingsToggle({ badge, isOpen, onClick }: Props, ref: React.Ref<Ref>): JSX.Element {
    return (
        <div className={classNames('bp-SettingsToggle', { 'bp-is-open': isOpen })}>
            <button
                ref={ref}
                className="bp-SettingsToggle-button"
                onClick={onClick}
                title={__('media_settings')}
                type="button"
            >
                <IconGear24 className="bp-SettingsToggle-icon" />
                {React.isValidElement(badge) && <div className="bp-SettingsToggle-badge">{badge}</div>}
            </button>
        </div>
    );
}

export default React.forwardRef(SettingsToggle);
