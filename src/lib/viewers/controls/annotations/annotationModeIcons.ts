import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import PencilTip from '@box/blueprint-web-assets/icons/Medium/PencilTip';
import SquarePlus from '@box/blueprint-web-assets/icons/Medium/SquarePlus';
import TCursorHighlight from '@box/blueprint-web-assets/icons/Medium/TCursorHighlight';
import { AnnotationMode } from '../../../types';

export type ActiveAnnotationMode = Exclude<AnnotationMode, AnnotationMode.NONE>;

const ANNOTATION_MODE_ICONS: Record<ActiveAnnotationMode, React.ComponentProps<typeof Toolbar.ToggleItem>['icon']> = {
    [AnnotationMode.DRAWING]: PencilTip,
    [AnnotationMode.HIGHLIGHT]: TCursorHighlight,
    [AnnotationMode.REGION]: SquarePlus,
};

export default ANNOTATION_MODE_ICONS;
