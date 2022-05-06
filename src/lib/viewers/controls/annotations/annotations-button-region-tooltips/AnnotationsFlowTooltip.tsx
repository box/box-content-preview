import React from 'react';
import TargetedClickThroughTooltip from '../../tooltip';
import { ControlsLayerContext } from '../../controls-layer';
import { ExperiencesContext } from '../../experiences';
import { TargetingApi } from '../../../../types';
import './AnnotationsFlowTooltip.scss';

export type Props = React.PropsWithChildren<{
    isEnabled?: boolean;
}>;

export default function AnnotationsFlowTooltip({ children, isEnabled = false }: Props): JSX.Element | null {
    const { experiences } = React.useContext(ExperiencesContext);
    const { setIsForced } = React.useContext(ControlsLayerContext);

    const {
        tooltipFlowAnnotations: experience = {
            canShow: false,
            onClose(): void {
                // do nothing
            },
            onComplete(): void {
                // do nothing
            },
            onShow(): void {
                // do nothing
            },
        },
    } = experiences;

    const useTargetingApi = (): TargetingApi => ({
        canShow: experience.canShow,
        onClose: (): void => {
            experience.onClose();
            setIsForced(false);
        },
        onComplete: (): void => {
            experience.onComplete();
            setIsForced(false);
        },
        onShow: (): void => {
            experience.onShow();
            setIsForced(true);
        },
    });

    return (
        <TargetedClickThroughTooltip
            className="bp-AnnotationsFlowTooltip"
            closeOnClickOutside
            shouldTarget={isEnabled}
            showCloseButton
            text={
                <div>
                    <h3 className="bp-AnnotationsFlowTooltip-title">{__('annotations_tooltip_title')}</h3>
                    <p className="bp-AnnotationsFlowTooltip-body">{__('annotations_tooltip_body')}</p>
                </div>
            }
            theme="callout"
            useTargetingApi={useTargetingApi}
        >
            {children}
        </TargetedClickThroughTooltip>
    );
}
