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
    fileId: string;
    onClick?: (mode: AnnotationMode) => void;
    mode: AnnotationMode;
};

export default function AnnotationsButton({
    children,
    className,
    isEnabled = true,
    isActive = false,
    fileId,
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
            data-resin-fileid={fileId}
            onClick={(): void => onClick(mode)}
            type="button"
            {...rest}
        >
            {children}
        </button>
    );
}
