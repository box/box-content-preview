import React from 'react';
import classNames from 'classnames';
import IconSearch24 from '../icons/IconSearch24';
import IconSearchMedium24 from '../icons/IconSearchMedium24';
import './FindBarToggle.scss';

export type Props = {
    modernizationEnabled?: boolean;
    onFindBarToggle?: (buttonElement: EventTarget | null) => void;
};

export default function FindBarToggle({ modernizationEnabled = false, onFindBarToggle }: Props): JSX.Element | null {
    if (!onFindBarToggle) {
        return null;
    }

    return (
        <button
            className={classNames('bp-FindBarToggle', {
                'bp-FindBarToggle--modernized': modernizationEnabled,
            })}
            onClick={({ target }): void => onFindBarToggle(target)}
            title={__('toggle_findbar')}
            type="button"
        >
            {modernizationEnabled ? <IconSearchMedium24 /> : <IconSearch24 />}
        </button>
    );
}
