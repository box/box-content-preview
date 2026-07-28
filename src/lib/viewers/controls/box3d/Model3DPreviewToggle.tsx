import React from 'react';
import Toggle from 'box-ui-elements/es/components/toggle';
import './Model3DPreviewToggle.scss';

export type Props = {
    icon: React.ReactElement;
    isChecked: boolean;
    label: string;
    onChange: (isChecked: boolean) => void;
};

// A single "Preview options" row: leading branded icon, label, and a right-aligned
// Blueprint Toggle switch. Matches the Image #4 settings design.
export default function Model3DPreviewToggle({ icon, isChecked, label, onChange }: Props): JSX.Element {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.checked);
    };

    return (
        <div className="bp-Model3DPreviewToggle" data-resin-target="model3dPreviewToggle">
            <span className="bp-Model3DPreviewToggle-icon">{icon}</span>
            <span className="bp-Model3DPreviewToggle-label">{label}</span>
            <Toggle isOn={isChecked} label="" onChange={handleChange} />
        </div>
    );
}
