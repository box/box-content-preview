import React from 'react';
import MediaSettingsToggle from './MediaSettingsToggle';

export type Props = {
    children: React.ReactNode;
};

export default function MediaSettingsControls({ children, ...rest }: Props): JSX.Element | null {
    const [isOpen, setOpen] = React.useState(false);

    const handleClick = (): void => {
        setOpen(!isOpen);
    };

    if (!children) {
        return null;
    }

    return (
        <div className="bp-MediaSettingsControls" {...rest}>
            <MediaSettingsToggle isOpen={isOpen} onClick={handleClick} />
            {isOpen && children}
        </div>
    );
}
