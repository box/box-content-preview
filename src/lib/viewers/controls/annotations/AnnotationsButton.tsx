import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { AnnotationMode } from '../../../types';
import './AnnotationsButton.scss';

export type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    children?: React.ReactNode;
    className?: string;
    isActive?: boolean;
    isEnabled?: boolean;
    mode: AnnotationMode;
    onClick?: (mode: AnnotationMode) => void;
};

function AnnotationsButton(props: Props, ref: React.Ref<HTMLButtonElement>): JSX.Element | null {
    const { children, className, isActive = false, isEnabled = true, mode, onClick = noop, ...rest } = props;

    if (!isEnabled) {
        return null;
    }

    return (
        <button
            ref={ref}
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

export default React.forwardRef(AnnotationsButton);
