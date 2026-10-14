import React from 'react';
import { stopActivationKeyPropagation } from './utils';

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function MediaToggle(props: Props): JSX.Element {
    return <button onKeyDown={stopActivationKeyPropagation} type="button" {...props} />;
}
