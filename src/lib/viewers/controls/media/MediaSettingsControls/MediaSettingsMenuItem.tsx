import React from 'react';
import classNames from 'classnames';
import IconArrowRight24 from '../../icons/IconArrowRight24';
import './MediaSettingsMenuItem.scss';

export type Props = {
    className?: string;
    label: string;
    onClick: () => void;
    value: string;
};

export default function MediaSettingsMenuItem({ className, onClick, label, value }: Props): JSX.Element {
    return (
        // TODO: handle all keyboard events
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            aria-haspopup="true"
            className={classNames('bp-MediaSettingsMenuItem', className)}
            onClick={onClick}
            role="menuitem"
            tabIndex={0}
        >
            <div aria-label={label} className="bp-MediaSettingsMenuItem-label">
                {label}
            </div>
            <div className="bp-MediaSettingsMenuItem-value">{value}</div>
            <div className="bp-MediaSettingsMenuItem-arrow">
                <IconArrowRight24 />
            </div>
        </div>
    );
}
