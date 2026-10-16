import React from 'react';
import { Play } from '@box/blueprint-web-assets/icons/MediumFilled';

// IconButton sizes its icon from its own size map (24px at most); play overlays need 48px.
export default function PlayOverlayIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return <Play {...props} height={48} width={48} />;
}
