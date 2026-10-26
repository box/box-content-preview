import React from 'react';
import PageControlsV2 from './PageControlsV2';
import { ControlsBarItem } from '../controls-bar/useControlsOverflow';
import { Props } from './PageControls';

// Page has no menu form and stays on the bar at every width. A single page is left out entirely, so the bar
// never reserves width for a control that would render nothing.
export default function getPageItem(props: Props): ControlsBarItem | false {
    return (
        props.pageCount > 1 && {
            control: <PageControlsV2 {...props} />,
            id: 'page',
        }
    );
}
