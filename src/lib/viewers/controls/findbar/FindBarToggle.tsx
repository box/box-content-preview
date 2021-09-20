import React from 'react';
import IconSearch24 from '../icons/IconSearch24';
import './FindBarToggle.scss';

export type Props = {
    onFindBarToggle?: (buttonElement: HTMLDivElement | null) => void;
};

export default function FindBarToggle({ onFindBarToggle }: Props): JSX.Element | null {
    const buttonReference = React.useRef(null);

    if (!onFindBarToggle) {
        return null;
    }
    const onClickHandler = () => {
        onFindBarToggle(buttonReference.current);
    };

    return (
        <button
            ref={buttonReference}
            className="bp-FindBarToggle"
            onClick={onClickHandler}
            title={__('toggle_findbar')}
            type="button"
        >
            <IconSearch24 />
        </button>
    );
}
