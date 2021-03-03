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
    const handleKeydown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Enter' && event.key !== 'Space') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        onClick();
    };

    return (
        <div
            aria-haspopup="true"
            className={classNames('bp-MediaSettingsMenuItem', className)}
            onClick={onClick}
            onKeyDown={handleKeydown}
            role="menuitem"
            tabIndex={0}
        >
            <div aria-label={label} className="bp-MediaSettingsMenuItem-label">
                {label}
            </div>
            <div className="bp-MediaSettingsMenuItem-value">{value}</div>
            <div className="bp-MediaSettingsMenuItem-arrow">
                <IconArrowRight24 className="bp-MediaSettingsMenuItem-arrowIcon" />
            </div>
        </div>
    );
}
