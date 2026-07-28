import * as React from 'react';

// Branded "clay" solid-cube glyph — from the "3D Preview Assets" icon set. Render-mode option.
function Icon3DClay24(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg
            data-testid="Icon3DClay24"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 16 16"
            width="1em"
            {...props}
        >
            <path
                d="M2.691 11.707a1.477 1.477 0 0 1-.755-1.313v-5.25a1.478 1.478 0 0 1 .755-1.312l4.553-2.625c.235-.14.485-.21.75-.21.266 0 .52.07.762.21l4.547 2.625a1.478 1.478 0 0 1 .756 1.313v5.25a1.497 1.497 0 0 1-.756 1.312l-4.547 2.63a1.482 1.482 0 0 1-.762.212c-.265 0-.515-.07-.75-.211l-4.553-2.631Zm4.664 1.207V8.326L3.22 5.965v4.195c0 .238.107.422.322.55l3.709 2.145a.292.292 0 0 1 .053.036.268.268 0 0 0 .052.023Zm.633-5.719 4.295-2.455a1.263 1.263 0 0 0-.076-.058l-3.89-2.245a.59.59 0 0 0-.64 0L3.794 4.683l-.053.035a.284.284 0 0 0-.04.035l4.288 2.443Zm.65 5.72.077-.042c.023-.012.053-.027.088-.047l3.656-2.115a.611.611 0 0 0 .316-.55V5.952L8.64 8.314v4.6Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default Icon3DClay24;
