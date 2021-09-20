import React from 'react';
import IconSearch24 from '../icons/IconSearch24';
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
            <IconSearch24 />
        </button>
    );
}
