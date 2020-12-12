import React from 'react';
import usePreventKey from '../hooks/usePreventKey';

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function MediaToggle(props: Props): JSX.Element {
    const buttonElRef = React.useRef<HTMLButtonElement>(null);

    usePreventKey(buttonElRef, ['Enter', 'Space']);

    return <button ref={buttonElRef} type="button" {...props} />;
}
