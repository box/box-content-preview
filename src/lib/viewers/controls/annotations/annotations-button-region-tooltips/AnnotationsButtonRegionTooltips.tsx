import React from 'react';

import { ExperiencesContext } from '../../experiences';

import AnnotationsFlowTooltip from './AnnotationsFlowTooltip';
import PersistentOnboardingBoxEditAnnotationsTooltip from './PersistentOnboardingBoxEditAnnotationsTooltip';

export type Props = React.PropsWithChildren<{
    isEnabled?: boolean;
}>;

export default function AnnotationsButtonRegionTooltips({ children, isEnabled }: Props): JSX.Element {
    const { experiences } = React.useContext(ExperiencesContext);

    const { persistentOnboardingBoxEditAnnotations: experience } = experiences;
    const canShow = experience ? experience.canShow : false;

    if (canShow) {
        return (
            <PersistentOnboardingBoxEditAnnotationsTooltip isEnabled={isEnabled}>
                {children}
            </PersistentOnboardingBoxEditAnnotationsTooltip>
        );
    }
    return <AnnotationsFlowTooltip isEnabled={isEnabled}>{children}</AnnotationsFlowTooltip>;
}
