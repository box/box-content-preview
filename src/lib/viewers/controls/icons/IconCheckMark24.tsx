import * as React from 'react';

function IconCheckMark24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="IconCheckMark24"
            fill="#22A7F0"
            focusable="false"
            height={24}
            viewBox="0 0 24 24"
            width={24}
            {...props}
        >
            <path d="M0 0h24v24H0z" fill="none" />
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
        </svg>
    );
}

export default IconCheckMark24;
