import React from 'react';
import noop from 'lodash/noop';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import AnnotationsButton from './AnnotationsButton';
import IconDrawing24 from '../icons/IconDrawing24';
import IconHighlightText16 from '../icons/IconHighlightText16';
import IconRegion24 from '../icons/IconRegion24';
import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode, TargetingApi } from '../../../types';
import './AnnotationsControls.scss';

export type Props = {
    annotationColor?: string;
    annotationMode?: AnnotationMode;
    experiences: {
        [name: string]: TargetingApi;
    };
    hasDrawing?: boolean;
    hasHighlight?: boolean;
    hasRegion?: boolean;
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
    onAnnotationModeEscape?: () => void;
    setWasClosedByUser?: (experienceName: string | undefined) => void;
};

export default function AnnotationsControls({
    annotationColor = bdlBoxBlue,
    annotationMode = AnnotationMode.NONE,
    experiences,
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape = noop,
    setWasClosedByUser = noop,
}: Props): JSX.Element | null {
    const isFullscreen = useFullscreen();
    const showDrawing = !isFullscreen && hasDrawing;
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    // Component event handlers
    const handleModeClick = (mode: AnnotationMode): void => {
        onAnnotationModeClick({ mode: annotationMode === mode ? AnnotationMode.NONE : mode });
    };

    // Global event handlers
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            onAnnotationModeEscape();
        };

        if (annotationMode !== AnnotationMode.NONE) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return (): void => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [annotationMode, onAnnotationModeEscape]);

    // Prevent empty group from being displayed
    if (!showDrawing && !showHighlight && !showRegion) {
        return null;
    }

    const isDrawingActive = annotationMode === AnnotationMode.DRAWING;

    return (
        <div className="bp-AnnotationsControls">
            <AnnotationsButton
                data-resin-target="draw"
                data-testid="bp-AnnotationsControls-drawBtn"
                isActive={isDrawingActive}
                isEnabled={showDrawing}
                mode={AnnotationMode.DRAWING}
                onClick={handleModeClick}
                setWasClosedByUser={setWasClosedByUser}
                title={__('drawing_comment')}
                tooltipFlowAnnotationsExperience={experiences.tooltipFlowAnnotationsExperience}
            >
                <IconDrawing24 fill={isDrawingActive ? annotationColor : '#fff'} />
            </AnnotationsButton>
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
