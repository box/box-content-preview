import React from 'react';
import Tooltip from 'box-ui-elements/es/components/tooltip/Tooltip';
import { withTargetedClickThrough } from 'box-ui-elements/es/features/targeting/hocs';
import { ControlsLayerContext } from '../controls-layer';
import { ExperiencesContext } from '../experiences';
import { TargetingApi } from '../../../types';
import './AnnotationsTargetedTooltip.scss';

export type Props = {
    children: React.ReactElement;
    isEnabled?: boolean;
};

function AnnotationsTargetedTooltip({ children, isEnabled = false }: Props): JSX.Element | null {
    const { experiences } = React.useContext(ExperiencesContext);
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [wasClosedByUser, setWasClosedByUser] = React.useState(false);

    const shouldTarget = !!(
        isEnabled &&
        experiences &&
        experiences.tooltipFlowAnnotationsExperience &&
        experiences.tooltipFlowAnnotationsExperience.canShow
    );

    if (!shouldTarget) {
        return children;
    }

    return (
        <TargetedClickThroughTooltip
            className="bp-AnnotationsTooltip"
            shouldTarget
            showCloseButton
            text={
                <div>
                    <h3 className="bp-AnnotationsTooltip-title">{__('annotations_tooltip_title')}</h3>
                    <p className="bp-AnnotationsTooltip-body">{__('annotations_tooltip_body')}</p>
                </div>
            }
            theme="callout"
            useTargetingApi={(): TargetingApi => {
                return {
                    ...experiences.tooltipFlowAnnotationsExperience,
                    onClose: (): void => {
                        experiences.tooltipFlowAnnotationsExperience.onClose();
                        setIsForced(false);
                    },
                    onShow: (): void => {
                        experiences.tooltipFlowAnnotationsExperience.onShow();

                        if (wasClosedByUser) {
                            return;
                        }

                        setWasClosedByUser(true);
                        setIsForced(true);
                    },
                };
            }}
        >
            {children}
        </TargetedClickThroughTooltip>
    );
}

const TargetedClickThroughTooltip = withTargetedClickThrough(
    ({ children, ...props }: { children: React.ReactNode }): JSX.Element => {
        return (
            <Tooltip {...props}>
                <>{children}</>
            </Tooltip>
        );
    },
);

export default AnnotationsTargetedTooltip;
