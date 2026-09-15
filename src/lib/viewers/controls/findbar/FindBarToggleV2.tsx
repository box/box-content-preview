import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import Search from '@box/blueprint-web-assets/icons/Medium/Search';
import { Props } from './FindBarToggle';

export default function FindBarToggleV2({ onFindBarToggle }: Props): JSX.Element | null {
    if (!onFindBarToggle) {
        return null;
    }

    return (
        <Tooltip content={__('toggle_findbar')}>
            <Toolbar.Button
                aria-label={__('toggle_findbar')}
                data-resin-target="findBar"
                onClick={({ target }): void => onFindBarToggle(target)}
            >
                <Toolbar.Icon icon={Search} />
            </Toolbar.Button>
        </Tooltip>
    );
}
