import * as React from 'react';

// Simple 4-way "pan/move" glyph (cross of arrows) — used for the spacebar-drag pan tool.
// Built from primitive shapes rather than a hand-drawn path so its geometry is easy to verify.
function IconHandMedium24({ ...rest }: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="IconHandMedium24"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 24 24"
            width="1em"
            {...rest}
        >
            <path d="M12 2 9 5h2v4H7V7l-3 3 3 3v-2h4v4H9l3 3 3-3h-2v-4h4v2l3-3-3-3v2h-4V5h2L12 2Z" fill="#fff" />
        </svg>
    );
}

export default IconHandMedium24;
