import React from 'react';
import IconReset24 from '../icons/IconReset24';
import './ResetControl.scss';

export type Props = {
    onReset: () => void;
};

export default function ResetControl({ onReset }: Props): JSX.Element {
    const handleClick = (): void => {
        onReset();
    };

    return (
        <button className="bp-ResetControl" onClick={handleClick} title={__('box3d_reset')} type="button">
            <IconReset24 />
        </button>
    );
}
