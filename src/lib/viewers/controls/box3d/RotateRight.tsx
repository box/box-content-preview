import React, { SVGProps } from 'react';
import { RotateLeft } from '@box/blueprint-web-assets/icons/Medium';
import './RotateRight.scss';

// Blueprint has RotateLeft and no RotateRight. Mirror the left glyph for the clockwise control.
export default function RotateRight(props: SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <RotateLeft {...props} className={['bp-RotateRight', props.className].filter(Boolean).join(' ')} />
    );
}
