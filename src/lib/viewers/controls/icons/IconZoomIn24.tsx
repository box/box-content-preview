import * as React from 'react';

function IconZoomIn24(): JSX.Element {
    return (
        <svg focusable={false} height={24} viewBox="0 0 24 24" width={24}>
            <circle cx="10" cy="10" fill="none" r="6.25" stroke="currentColor" strokeWidth="1.75" />
            <path d="M14.5 14.5 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
            <path
                d="M10 7.25v5.5M7.25 10h5.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.75"
            />
        </svg>
    );
}

export default IconZoomIn24;
