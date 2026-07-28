import * as React from 'react';

// Branded "normals" shaded-cube glyph — from the "3D Preview Assets" icon set. Render-mode option.
function Icon3DNormals24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="Icon3DNormals24"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 16 16"
            width="1em"
            {...props}
        >
            <path
                d="M7.988 7.342 2.346 4.107a1.514 1.514 0 0 1 .345-.275l4.553-2.625c.235-.14.485-.21.75-.21.266 0 .52.07.762.21l4.547 2.625c.062.035.12.076.175.123.06.047.112.096.159.147l-5.649 3.24Zm-.51.914v6.193a1.166 1.166 0 0 1-.123-.053 2.21 2.21 0 0 1-.11-.058L2.69 11.707a1.477 1.477 0 0 1-.755-1.313V5.239c0-.054.002-.103.005-.146l5.54 3.163Zm1.043-.012 5.526-3.164a.465.465 0 0 1 .006.076.542.542 0 0 1 .006.076v5.163c0 .273-.067.527-.2.761-.132.23-.316.412-.55.545l-4.547 2.631c-.082.05-.162.09-.24.117V8.244Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default Icon3DNormals24;
