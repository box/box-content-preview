import React from 'react';
import TargetedClickThroughGuideTooltip from 'box-ui-elements/es/features/targeting/TargetedClickThroughGuideTooltip';
import ControlsContext from '../controls-context';

import { TargetingApi } from '../../../types';

export type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    children: React.ReactNode;
    isEnabled?: boolean;
};

export default function AnnotationsTargetedTooltip({ children, isEnabled = false }: Props): JSX.Element | null {
    const { experiences } = React.useContext(ControlsContext);

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
            useTargetingApi={(): TargetingApi => experiences.tooltipFlowAnnotationsExperience}
        >
            {children}
        </TargetedClickThroughGuideTooltip>
    );
}
