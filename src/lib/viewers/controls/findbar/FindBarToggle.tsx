import React from 'react';
import IconSearch18 from '../icons/IconSearch18';
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
            <IconSearch18 />
        </button>
    );
}
