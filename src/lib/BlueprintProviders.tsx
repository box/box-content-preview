import React from 'react';
import { BlueprintProvider, TooltipProvider, useNoopTreatment } from '@box/blueprint-web';

export type Props = {
    children: React.ReactNode;
    // Portaled Blueprint content renders here. Fullscreen only shows the fullscreen element's
    // subtree, so this must be the viewer container (or inside it), not document.body.
    container?: HTMLElement | null;
};

// Tooltips read the container from TooltipProvider; Popover and DropdownMenu content take it as a prop.
export const PortalContainerContext = React.createContext<HTMLElement | null | undefined>(undefined);

// Preview has no Split client, so Blueprint's treatment-driven configuration resolves to its defaults.
export default function BlueprintProviders({ children, container }: Props): JSX.Element {
    return (
        <BlueprintProvider useTreatment={useNoopTreatment}>
            <PortalContainerContext.Provider value={container}>
                <TooltipProvider container={container}>{children}</TooltipProvider>
            </PortalContainerContext.Provider>
        </BlueprintProvider>
    );
}
