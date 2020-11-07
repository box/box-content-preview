import React from 'react';
import noop from 'lodash/noop';
import AnnotationsButton from './AnnotationsButton';
import IconHighlightText16 from '../icons/IconHighlightText16';
import IconRegion24 from '../icons/IconRegion24';
import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode } from './types';
import './AnnotationsControls.scss';

export type Props = {
    annotationMode?: AnnotationMode;
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
    hasHighlight?: boolean;
    hasRegion?: boolean;
};

export default function AnnotationsControls({
    annotationMode = AnnotationMode.NONE,
    onAnnotationModeClick = noop,
    hasHighlight = true,
    hasRegion = true,
}: Props): JSX.Element | null {
    const isFullscreen = useFullscreen();
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    if (!showHighlight && !showRegion) {
        return null;
    }

    const handleModeClick = (mode: AnnotationMode): void => {
        onAnnotationModeClick({ mode: annotationMode === mode ? AnnotationMode.NONE : mode });
    };

    return (
        <div className="bp-AnnotationsControls">
            <AnnotationsButton
                data-resin-target="highlightRegion"
                data-testid="bp-AnnotationsControls-regionBtn"
                isActive={annotationMode === AnnotationMode.REGION}
                isEnabled={showRegion}
                mode={AnnotationMode.REGION}
                onClick={handleModeClick}
                title={__('region_comment')}
            >
                <IconRegion24 />
            </AnnotationsButton>
            <AnnotationsButton
                data-resin-target="highlightText"
                data-testid="bp-AnnotationsControls-highlightBtn"
                isActive={annotationMode === AnnotationMode.HIGHLIGHT}
                isEnabled={showHighlight}
                mode={AnnotationMode.HIGHLIGHT}
                onClick={handleModeClick}
                title={__('highlight_text')}
            >
                <IconHighlightText16 />
            </AnnotationsButton>
        </div>
    );
}
