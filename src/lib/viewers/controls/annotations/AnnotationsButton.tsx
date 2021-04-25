import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import TargetedClickThroughGuideTooltip from 'box-ui-elements/es/features/targeting/TargetedClickThroughGuideTooltip';
import { AnnotationMode, TargetingApi } from '../../../types';

import './AnnotationsButton.scss';

export type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    children?: React.ReactNode;
    className?: string;
    isActive?: boolean;
    isEnabled?: boolean;
    mode: AnnotationMode;
    onClick?: (mode: AnnotationMode) => void;
    setWasClosedByUser?: (experienceName: string | undefined) => void;
    tooltipFlowAnnotationsExperience?: TargetingApi;
};

export default function AnnotationsButton({
    children,
    className,
    isActive = false,
    isEnabled = true,
    mode,
    onClick = noop,
    setWasClosedByUser = noop,
    tooltipFlowAnnotationsExperience = {
        canShow: false,
        onClose: noop,
        onComplete: noop,
        onShow: noop,
    },
    ...rest
}: Props): JSX.Element | null {
    if (!isEnabled) {
        return null;
    }

    return (
        <TargetedClickThroughGuideTooltip
            body={__('annotations_tooltip_body')}
            className="preview-annotations-tooltip"
            shouldTarget={tooltipFlowAnnotationsExperience.canShow}
            showCloseButton
            title={__('annotations_tooltip_title')}
            useTargetingApi={(): TargetingApi => {
                return {
                    ...tooltipFlowAnnotationsExperience,
                    onClose: (): void => {
                        setWasClosedByUser('tooltipFlowAnnotationsExperience');
                        tooltipFlowAnnotationsExperience.onClose();
                    },
                };
            }}
        >
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
        </TargetedClickThroughGuideTooltip>
    );
}
