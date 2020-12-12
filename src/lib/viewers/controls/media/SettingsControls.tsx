import React from 'react';
import classNames from 'classnames';
import IconGear24 from '../icons/IconGear24';
import MediaToggle from './MediaToggle';
import './SettingsControls.scss';

export default function SettingsControls(): JSX.Element {
    const [isOpen, setOpen] = React.useState(false);

    const handleClick = (): void => {
        setOpen(!isOpen);
    };

    return (
        <div className="bp-SettingsControls">
            <MediaToggle
                className={classNames('bp-SettingsControls-toggle', { 'bp-is-open': isOpen })}
                onClick={handleClick}
                title={__('media_settings')}
            >
                <IconGear24 className="bp-SettingsControls-toggle-icon" />
            </MediaToggle>

            {/*  TODO: Add settings popup(s)  */}
        </div>
    );
}
