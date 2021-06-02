import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../icons/IconGear24';
import './SettingsToggle.scss';

export type Props = {
    badge?: React.ReactElement;
    className?: string;
    isOpen: boolean;
    onClick: () => void;
};

export type Ref = HTMLButtonElement;

function SettingsToggle({ badge, className, isOpen, onClick }: Props, ref: React.Ref<Ref>): JSX.Element {
    return (
        <div className={classNames('bp-SettingsToggle', className, { 'bp-is-open': isOpen })}>
            <button
                ref={ref}
                className="bp-SettingsToggle-button"
                onClick={onClick}
                title={__('media_settings')}
                type="button"
            >
                <IconGear24 className="bp-SettingsToggle-icon" />
            </button>
            {React.isValidElement(badge) && <div className="bp-SettingsToggle-badge">{badge}</div>}
        </div>
    );
}

export default React.forwardRef(SettingsToggle);
