import * as React from 'react';

// "Environment" glyph — a landscape/mountain range with a sparkle, matching the newer
// settings-menu design direction (replaces the older globe). Preview-options toggle.
function Icon3DEnvironment24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="Icon3DEnvironment24"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 16 16"
            width="1em"
            {...props}
        >
            <path
                d="M1.75 12.75 5.5 6.5l2.6 4.05M7 12.75l3.2-5.1 4.05 6.1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.25"
            />
            <path
                d="M12.25 1.75c.24 1.24.79 1.79 2.03 2.03-1.24.24-1.79.79-2.03 2.03-.24-1.24-.79-1.79-2.03-2.03 1.24-.24 1.79-.79 2.03-2.03Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default Icon3DEnvironment24;
