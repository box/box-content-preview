import * as React from 'react';

// "Grab" hand glyph (Material pan_tool) — used for the spacebar-drag pan tool.
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
            <path
                d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S12 3.17 12 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S16 .67 16 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"
                fill="#fff"
            />
        </svg>
    );
}

export default IconHandMedium24;
