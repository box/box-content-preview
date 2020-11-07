import React, { ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { AnnotationMode } from './types';
import './AnnotationsButton.scss';

export type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    children?: React.ReactNode;
    className?: string;
    isActive?: boolean;
    isEnabled?: boolean;
    onClick?: (mode: AnnotationMode) => void;
    mode: AnnotationMode;
};

export default function AnnotationsButton({
    children,
    className,
    isEnabled = true,
    isActive = false,
    onClick = noop,
    mode,
    ...rest
}: Props): JSX.Element | null {
    if (!isEnabled) {
        return null;
    }

    return (
        <button
            className={classNames('bp-AnnotationsButton', className, {
                'bp-is-active': isActive,
            })}
            onClick={(): void => onClick(mode)}
            type="button"
            {...rest}
        >
            {children}
        </button>
    );
}
