import * as React from 'react';

function IconZoomIn10(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg focusable="false" height={10} viewBox="0 0 10 10" width={10} {...props}>
            <path
                d="M5 0c.552 0 1 .456 1 .995V4h3.005c.51 0 .93.383.988.883L10 5c0 .552-.456 1-.995 1H6v3.005c0 .51-.383.93-.883.988L5 10c-.552 0-1-.456-1-.995V6H.995A.995.995 0 010 5c0-.552.456-1 .995-1H4V.995c0-.51.383-.93.883-.988L5 0z"
                fill="#FFF"
                fillRule="evenodd"
            />
        </svg>
    );
}

export default IconZoomIn10;
