import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import ChevronDown from '@box/blueprint-web-assets/icons/Medium/ChevronDown';
import ChevronUp from '@box/blueprint-web-assets/icons/Medium/ChevronUp';
import ControlsPillV2 from '../controls-bar/ControlsPillV2';
import PageControlsFormV2 from './PageControlsFormV2';
import { Props } from './PageControls';

export default function PageControlsV2({
    onPageChange,
    onPageSubmit,
    pageCount,
    pageNumber,
}: Props): JSX.Element | null {
    if (pageCount <= 1) {
        return null;
    }

    return (
        <ControlsPillV2>
            <Tooltip content={__('previous_page')}>
                <Toolbar.Button
                    className="bp-ControlsPillV2-button"
                    aria-label={__('previous_page')}
                    data-resin-target="pagePrevious"
                    data-testid="bp-PageControls-previous"
                    disabled={pageNumber === 1}
                    onClick={(): void => onPageChange(pageNumber - 1)}
                >
                    <Toolbar.Icon icon={ChevronUp} />
                </Toolbar.Button>
            </Tooltip>
            <PageControlsFormV2 onPageSubmit={onPageSubmit} pageCount={pageCount} pageNumber={pageNumber} />
            <Tooltip content={__('next_page')}>
                <Toolbar.Button
                    className="bp-ControlsPillV2-button"
                    aria-label={__('next_page')}
                    data-resin-target="pageNext"
                    data-testid="bp-PageControls-next"
                    disabled={pageNumber === pageCount}
                    onClick={(): void => onPageChange(pageNumber + 1)}
                >
                    <Toolbar.Icon icon={ChevronDown} />
                </Toolbar.Button>
            </Tooltip>
        </ControlsPillV2>
    );
}
