import React from 'react';
import { LoadingIndicator } from '@box/blueprint-web';
import './MediaLoadingIndicator.scss';

export const CLASS_MEDIA_LOADING_INDICATOR = 'bp-MediaLoadingIndicator';

// Renders inside an element with CLASS_MEDIA_LOADING_INDICATOR, which draws the dark disc.
export default function MediaLoadingIndicator(): JSX.Element {
    return <LoadingIndicator aria-label={__('media_loading')} size="x-large" variant="light" />;
}
