import * as React from 'react';

function IconZoom24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg data-testid="IconZoom24" focusable={false} height={24} viewBox="0 0 24 24" width={24} {...props}>
            <path
                d="M2 12h20M6 8l-4 4 4 4M18 8l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    );
}

export default IconZoom24;
