import React from 'react';
import classNames from 'classnames';
import { decodeKeydown } from '../../../util';
import './Model3DRenderModeItem.scss';

export type Props = {
    icon?: React.ReactElement;
    isSelected: boolean;
    label: string;
    onSelect: () => void;
};

// A single render-mode row: leading branded icon, label, and a trailing checkmark when
// selected. Matches the settings-menu design (Image #4 render-mode list).
export default function Model3DRenderModeItem({ icon, isSelected, label, onSelect }: Props): JSX.Element {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const key = decodeKeydown(event);

        if (key === 'Enter' || key === 'Space') {
            onSelect();
        }
    };

    return (
        <div
            aria-checked={isSelected}
            className={classNames('bp-Model3DRenderModeItem', { 'bp-is-selected': isSelected })}
            data-resin-target="model3dRenderMode"
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            role="menuitemradio"
            tabIndex={0}
        >
            {icon && <span className="bp-Model3DRenderModeItem-icon">{icon}</span>}
            <span className="bp-Model3DRenderModeItem-label">{label}</span>
            {isSelected && (
                <svg
                    className="bp-Model3DRenderModeItem-check"
                    fill="none"
                    focusable="false"
                    height="1em"
                    role="img"
                    viewBox="0 0 16 16"
                    width="1em"
                >
                    <path
                        d="m13.5 4.5-7 7L3 8"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.25"
                    />
                </svg>
            )}
        </div>
    );
}
