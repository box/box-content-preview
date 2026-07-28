import * as React from 'react';

// DEMO ONLY — icon for the 3D version-diff toggle: two offset, overlapping
// squares suggesting two model versions layered for comparison.
function IconVersionDiffMedium24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="IconVersionDiffMedium24"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 24 24"
            width="1em"
            {...props}
        >
            <path
                d="M4 8a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Zm2 1v7h7V9H6Z"
                fill="#fff"
                fillRule="evenodd"
            />
            <path
                d="M9 5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1v-2h1V6h-7v1H9V5Z"
                fill="#fff"
                fillRule="evenodd"
            />
        </svg>
    );
}

export default IconVersionDiffMedium24;
