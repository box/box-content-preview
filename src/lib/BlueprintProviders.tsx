import React from 'react';
import {
    BlueprintConfigurationOptions,
    BlueprintProvider,
    TooltipProvider,
    useNoopTreatment,
} from '@box/blueprint-web';
import useHostInterFont from './useHostInterFont';

export type Props = {
    children: React.ReactNode;
    // Portaled Blueprint content renders here. Fullscreen only shows the fullscreen element's
    // subtree, so this must be the viewer container (or inside it), not document.body.
    container?: HTMLElement | null;
};

// Tooltips read the container from TooltipProvider; Popover and DropdownMenu content take it as a prop.
export const PortalContainerContext = React.createContext<HTMLElement | null | undefined>(undefined);

// Preview has no Split client, so Blueprint's treatment-driven configuration resolves to its defaults.
// Typography is the exception: it follows the host's is-inter-font class, including changes after mount.
export default function BlueprintProviders({ children, container }: Props): JSX.Element {
    const isInterFont = useHostInterFont();

    return (
        <BlueprintProvider
            configurationOverrides={
                isInterFont ? { typography: BlueprintConfigurationOptions.typography.inter } : undefined
            }
            useTreatment={useNoopTreatment}
        >
            <PortalContainerContext.Provider value={container}>
                <TooltipProvider container={container}>{children}</TooltipProvider>
            </PortalContainerContext.Provider>
        </BlueprintProvider>
    );
}
