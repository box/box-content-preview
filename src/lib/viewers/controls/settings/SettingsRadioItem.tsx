import React from 'react';
import classNames from 'classnames';
import IconCheckMark24 from '../icons/IconCheckMark24';
import { decodeKeydown } from '../../../util';
import './SettingsRadioItem.scss';

export type Props<V extends Value> = {
    className?: string;
    isSelected?: boolean;
    label?: string;
    onChange: (value: V) => void;
    value: V;
};
export type Ref = HTMLDivElement;
export type Value = boolean | number | string;

function SettingsRadioItem<V extends Value>(props: Props<V>, ref: React.Ref<Ref>): JSX.Element {
    const { className, isSelected, label, onChange, value } = props;

    const handleClick = (): void => {
        onChange(value);
    };

    const handleKeydown = (event: React.KeyboardEvent<Ref>): void => {
        const key = decodeKeydown(event);

        if (key !== 'ArrowLeft' && key !== 'Enter' && key !== 'Space') {
            return;
        }

        onChange(value);
    };

    return (
        <div
            ref={ref}
            aria-checked={isSelected ? 'true' : 'false'}
            className={classNames('bp-SettingsRadioItem', className, {
                'bp-is-selected': isSelected,
            })}
            onClick={handleClick}
            onKeyDown={handleKeydown}
            role="menuitemradio"
            tabIndex={0}
        >
            <div className="bp-SettingsRadioItem-check">
                <IconCheckMark24 className="bp-SettingsRadioItem-check-icon" height={16} width={16} />
            </div>
            <div className="bp-SettingsRadioItem-value">{label || value}</div>
        </div>
    );
}

export default React.forwardRef(SettingsRadioItem) as typeof SettingsRadioItem;
