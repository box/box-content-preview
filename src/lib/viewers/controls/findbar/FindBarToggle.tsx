import React from 'react';
import IconSearchMedium24 from '../icons/IconSearchMedium24';
import './FindBarToggle.scss';

export type Props = {
    onFindBarToggle?: (buttonElement: EventTarget | null) => void;
};

export default function FindBarToggle({ onFindBarToggle }: Props): JSX.Element | null {
    if (!onFindBarToggle) {
        return null;
    }

    return (
        <button
            className="bp-FindBarToggle"
            onClick={({ target }): void => onFindBarToggle(target)}
            title={__('toggle_findbar')}
            type="button"
        >
            <IconSearchMedium24 />
        </button>
    );
}
