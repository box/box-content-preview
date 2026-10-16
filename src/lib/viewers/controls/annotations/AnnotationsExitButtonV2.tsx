import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import XMark from '@box/blueprint-web-assets/icons/Medium/XMark';
import './AnnotationsExitButtonV2.scss';

export type Props = {
    onClick: () => void;
};

export default function AnnotationsExitButtonV2({ onClick }: Props): JSX.Element {
    return (
        <span className="bp-AnnotationsControls-exitBtn">
            <Tooltip content={__('exit_annotations')}>
                <Toolbar.Button
                    aria-label={__('exit_annotations')}
                    data-resin-target="exit"
                    data-testid="bp-annotations-controls-exit-btn"
                    onClick={onClick}
                >
                    <Toolbar.Icon icon={XMark} />
                </Toolbar.Button>
            </Tooltip>
        </span>
    );
}
