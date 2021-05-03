import React from 'react';
import TargetedClickThroughGuideTooltip from 'box-ui-elements/es/features/targeting/TargetedClickThroughGuideTooltip';
import { ControlsLayerContext } from '../controls-layer';
import { ExperiencesContext } from '../experiences';
import { TargetingApi } from '../../../types';

export type Props = React.PropsWithChildren<{
    isEnabled?: boolean;
}>;

export default function AnnotationsTargetedTooltip({ children, isEnabled = false }: Props): JSX.Element | null {
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
        return <div>{children}</div>;
    }

    return (
        <TargetedClickThroughGuideTooltip
            body={__('annotations_tooltip_body')}
            className="bp-AnnotationsTooltip"
            shouldTarget
            showCloseButton
            title={__('annotations_tooltip_title')}
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
        </TargetedClickThroughGuideTooltip>
    );
}
