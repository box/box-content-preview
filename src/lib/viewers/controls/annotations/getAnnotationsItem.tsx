import React from 'react';
import AnnotationsControlsV2, { Props } from './AnnotationsControlsV2';
import { ControlsBarItem } from '../controls-bar/useControlsOverflow';

// The markup controls have no menu form and stay on the bar at every width. Without an enabled mode they
// are left out, separator included.
export default function getAnnotationsItem(props: Props): ControlsBarItem | false {
    return (
        props.modes.length > 0 && {
            control: <AnnotationsControlsV2 {...props} />,
            id: 'annotations',
        }
    );
}
