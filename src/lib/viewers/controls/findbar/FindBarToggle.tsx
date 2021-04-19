import React from 'react';
import IconSearch24 from '../icons/IconSearch24';
import './FindBarToggle.scss';

export type Props = {
    onFindBarToggle?: () => void;
};

export default function FindBarToggle({ onFindBarToggle }: Props): JSX.Element | null {
    if (!onFindBarToggle) {
        return null;
    }

    return (
        <button className="bp-FindBarToggle" onClick={onFindBarToggle} title={__('toggle_findbar')} type="button">
            <IconSearch24 />
        </button>
    );
}
