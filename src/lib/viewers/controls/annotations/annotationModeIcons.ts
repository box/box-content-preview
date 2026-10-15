import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import DashedSquareBubble from '@box/blueprint-web-assets/icons/Medium/DashedSquareBubble';
import PencilScribble from '@box/blueprint-web-assets/icons/Medium/PencilScribble';
import TextHighlight from '@box/blueprint-web-assets/icons/Medium/TextHighlight';
import { AnnotationMode } from '../../../types';

export type ActiveAnnotationMode = Exclude<AnnotationMode, AnnotationMode.NONE>;

const ANNOTATION_MODE_ICONS: Record<ActiveAnnotationMode, React.ComponentProps<typeof Toolbar.ToggleItem>['icon']> = {
    [AnnotationMode.DRAWING]: PencilScribble,
    [AnnotationMode.HIGHLIGHT]: TextHighlight,
    [AnnotationMode.REGION]: DashedSquareBubble,
};

export default ANNOTATION_MODE_ICONS;
