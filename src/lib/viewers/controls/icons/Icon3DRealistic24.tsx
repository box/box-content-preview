import * as React from 'react';

// "Realistic" render-mode glyph (picture / landscape outline), matching the Blueprint
// Picture icon used in the settings design. Render-mode option for the "Lit" mode.
function Icon3DRealistic24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="Icon3DRealistic24"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 16 16"
            width="1em"
            {...props}
        >
            <path
                d="M13 2a2 2 0 011.995 1.85L15 4v8.132a2.01 2.01 0 01-1.843 1.862L13 14H3a2 2 0 01-1.995-1.85L1 12V4a2 2 0 011.85-1.995L3 2h10zm0 1H3a1 1 0 00-.993.883L2 4v5.459l2.67-2.335a.5.5 0 01.503-.093l.082.039.074.054 3.528 3.086 1.814-1.586a.5.5 0 01.502-.093l.082.039.074.054L14 10.96V4a1 1 0 00-.883-.993L13 3zm-2 2a1 1 0 110 2 1 1 0 010-2z"
                fill="currentColor"
            />
        </svg>
    );
}

export default Icon3DRealistic24;
