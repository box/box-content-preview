import React from 'react';
import classNames from 'classnames';

// TODO: Compare bundle sizes and possibly re-write here
import { TargetedClickThroughGuideTooltip } from 'box-ui-elements/es/features/targeting';

import i18n from '../../../../i18n';

import { TargetingApi } from '../../../../types';

import { ControlsLayerContext } from '../../controls-layer';
import { ExperiencesContext } from '../../experiences';

import './PersistentOnboardingBoxEditAnnotationsTooltip.scss';

const LOCALE_LANGUAGE_ENGLISH = 'en';

export type Props = React.PropsWithChildren<{
    isEnabled?: boolean;
}>;

export default function PersistentOnboardingBoxEditAnnotationsTooltip({
    children,
    isEnabled = false,
}: Props): JSX.Element {
    const { experiences } = React.useContext(ExperiencesContext);
    const { setIsForced } = React.useContext(ControlsLayerContext);

    const {
        persistentOnboardingBoxEditAnnotations: experience = {
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
            onPrevious(): void {
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

    const title = __('persistent_onboarding_box_edit_annotations_tooltip_title');
    const body = __('persistent_onboarding_box_edit_annotations_tooltip_body');

    const isLocaleLanguageEnglish = i18n.currentLocale === LOCALE_LANGUAGE_ENGLISH;
    const image = (
        <div
            className={classNames('bp-PersistentOnboardingBoxEditAnnotationsTooltip-image', {
                'bp-is-localized': !isLocaleLanguageEnglish,
            })}
            data-testid="tooltipImage"
        />
    );

    const primaryButtonProps = {
        children: __('persistent_onboarding_box_edit_annotations_tooltip_button_next'),
    };

    const backButtonProps = {
        children: __('persistent_onboarding_box_edit_annotations_tooltip_button_previous'),
        onClick(): void {
            experience.onPrevious();
        },
    };

    return (
        <TargetedClickThroughGuideTooltip
            body={body}
            closeOnClickOutside
            image={image}
            position="bottom-right"
            primaryButtonProps={primaryButtonProps}
            secondaryButtonProps={backButtonProps}
            shouldTarget={isEnabled}
            steps={[2, 3]}
            title={title}
            useTargetingApi={useTargetingApi}
        >
            {children}
        </TargetedClickThroughGuideTooltip>
    );
}
