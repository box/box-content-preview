import React from 'react';
import Tooltip, { TooltipTheme } from 'box-ui-elements/es/components/tooltip/Tooltip';
import { ControlsLayerContext } from '../controls-layer';
import './Comment3DOnboardingTooltip.scss';

export type Props = React.PropsWithChildren<{
    isEnabled?: boolean;
    onDismiss?: () => void;
}>;

/**
 * Instructional coach-mark anchored to the 3D "Comment" (annotate) toolbar button.
 *
 * Unlike AnnotationsTargetedTooltip (which is gated once-per-user by the targeting
 * service), this popover is driven purely by the `isEnabled` prop so it can be shown
 * on-demand when a user deep-links into a freshly uploaded 3D file from the upload
 * "Annotate" notification in EndUserApp.
 */
export default function Comment3DOnboardingTooltip({ children, isEnabled = false, onDismiss }: Props): JSX.Element {
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [isDismissed, setIsDismissed] = React.useState(false);

    // Derive visibility so the coach-mark can never drift out of sync with the enable
    // flag, and once dismissed it stays dismissed even if the parent re-renders with
    // isEnabled still true.
    const isShown = isEnabled && !isDismissed;

    React.useEffect(() => {
        // Keep the toolbar pinned open (bypasses the fade-out timer) while the coach-mark
        // is visible so the anchor button doesn't slide away underneath the popover.
        setIsForced(isShown);
    }, [isShown, setIsForced]);

    const handleDismiss = React.useCallback((): void => {
        setIsDismissed(true);
        setIsForced(false);

        if (onDismiss) {
            onDismiss();
        }
    }, [onDismiss, setIsForced]);

    return (
        <Tooltip
            className="bp-Comment3DOnboardingTooltip"
            isShown={isShown}
            onDismiss={handleDismiss}
            position="top-center"
            showCloseButton
            text={
                <div>
                    <h3 className="bp-Comment3DOnboardingTooltip-title">
                        {__('annotations_3d_onboarding_tooltip_title')}
                    </h3>
                    <p className="bp-Comment3DOnboardingTooltip-body">{__('annotations_3d_onboarding_tooltip_body')}</p>
                </div>
            }
            theme={TooltipTheme.CALLOUT}
        >
            {children}
        </Tooltip>
    );
}
