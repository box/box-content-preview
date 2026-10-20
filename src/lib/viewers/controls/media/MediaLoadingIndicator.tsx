import React from 'react';
import { LoadingIndicator } from '@box/blueprint-web';
import './MediaLoadingIndicator.scss';

export type Props = Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>;

export default function MediaLoadingIndicator(props: Props): JSX.Element {
    return (
        <div className="bp-MediaLoadingIndicator" {...props}>
            <LoadingIndicator aria-label={__('media_loading')} size="x-large" variant="light" />
        </div>
    );
}
