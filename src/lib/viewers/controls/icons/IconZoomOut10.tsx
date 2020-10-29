import * as React from 'react';

function IconZoomOut10(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg focusable="false" height={10} viewBox="0 0 10 10" width={10} {...props}>
            <rect fill="#FFF" fillRule="evenodd" height={2} rx={1} width={10} y={5} />
        </svg>
    );
}

export default IconZoomOut10;
