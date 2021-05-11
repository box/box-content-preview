import React from 'react';
import uniqueId from 'lodash/uniqueId';
import './SettingsCheckboxItem.scss';

export type Props = {
    isChecked: boolean;
    label: string;
    onChange: (isChecked: boolean) => void;
};

export default function SettingsCheckboxItem({ isChecked, label, onChange }: Props): JSX.Element {
    const { current: id } = React.useRef(uniqueId('bp-SettingsCheckboxItem_'));

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.checked);
    };

    return (
        <div className="bp-SettingsCheckboxItem">
            <input
                checked={isChecked}
                className="bp-SettingsCheckboxItem-input"
                id={id}
                onChange={handleChange}
                type="checkbox"
            />
            <label className="bp-SettingsCheckboxItem-label" htmlFor={id}>
                {label}
            </label>
        </div>
    );
}
