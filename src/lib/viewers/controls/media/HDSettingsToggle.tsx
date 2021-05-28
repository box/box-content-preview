import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../icons/IconGear24';
import './HDSettingsToggle.scss';

export type Props = {
    isHD?: boolean;
    isOpen: boolean;
    onClick: () => void;
};

export type Ref = HTMLButtonElement;

function HDSettingsToggle({ isHD = false, isOpen, onClick }: Props, ref: React.Ref<Ref>): JSX.Element {
    return (
        <div className={classNames('bp-HDSettingsToggle', { 'bp-is-open': isOpen, 'bp-is-hd': isHD })}>
            <button
                ref={ref}
                className="bp-HDSettingsToggle-button"
                onClick={onClick}
                title={__('media_settings')}
                type="button"
            >
                <IconGear24 className="bp-HDSettingsToggle-icon" />
            </button>
            <div className="bp-HDSettingsToggle-badge">HD</div>
        </div>
    );
}

export default React.forwardRef(HDSettingsToggle);
