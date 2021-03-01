import React from 'react';
import MediaSettingsControls from './MediaSettingsControls';
import MP3SettingsFlyout, { Props as MP3SettingsFlyoutProps } from './MP3SettingsFlyout';

export type Props = MP3SettingsFlyoutProps;

export default function MP3SettingsControls(props: Props): JSX.Element {
    return (
        <MediaSettingsControls>
            <MP3SettingsFlyout {...props} />
        </MediaSettingsControls>
    );
}
