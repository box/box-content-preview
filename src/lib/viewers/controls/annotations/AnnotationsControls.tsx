import React from 'react';
import noop from 'lodash/noop';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import AnnotationsButton from './AnnotationsButton';
import AnnotationsTargetedTooltip from './AnnotationsTargetedTooltip';
import IconPencilScribbleMedium24 from '../icons/IconPencilScribbleMedium24';
import IconExit24 from '../icons/IconExit24';
import IconTextHighlightMedium24 from '../icons/IconTextHighlightMedium24';
import IconDashedSquareBubbleMedium24 from '../icons/IconDashedSquareBubbleMedium24';
import useFullscreen from '../hooks/useFullscreen';
import { AnnotationMode } from '../../../types';
import './AnnotationsControls.scss';

export type Props = {
    annotationColor?: string;
    annotationMode?: AnnotationMode;
    hasDrawing?: boolean;
    hasHighlight?: boolean;
    hasRegion?: boolean;
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
    onAnnotationModeEscape?: () => void;
};

export default function AnnotationsControls({
    annotationColor = bdlBoxBlue,
    annotationMode = AnnotationMode.NONE,
    hasDrawing = false,
    hasHighlight = false,
    hasRegion = false,
    onAnnotationModeClick = noop,
    onAnnotationModeEscape = noop,
}: Props): JSX.Element | null {
    const annotationBtnRefs = {
        [AnnotationMode.DRAWING]: React.useRef<HTMLButtonElement | null>(null),
        [AnnotationMode.REGION]: React.useRef<HTMLButtonElement | null>(null),
        [AnnotationMode.HIGHLIGHT]: React.useRef<HTMLButtonElement | null>(null),
        [AnnotationMode.NONE]: React.useRef<HTMLButtonElement | null>(null),
    };
    const isFullscreen = useFullscreen();
    const showDrawing = !isFullscreen && hasDrawing;
    const showHighlight = !isFullscreen && hasHighlight;
    const showRegion = !isFullscreen && hasRegion;

    // Component event handlers
    const handleModeClick = (mode: AnnotationMode): void => {
        onAnnotationModeClick({ mode: annotationMode === mode ? AnnotationMode.NONE : mode });
    };

    const handleExitClick = (): void => {
        const btnRef = annotationBtnRefs[annotationMode];
        if (btnRef.current !== null) {
            btnRef.current.focus();
        }

        handleModeClick(AnnotationMode.NONE);
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
    const isRegionActive = annotationMode === AnnotationMode.REGION;

    return (
        <div className="bp-AnnotationsControls" data-testid="bp-annotations-controls">
            <AnnotationsButton
                ref={annotationBtnRefs[AnnotationMode.NONE]}
                className="bp-AnnotationsControls-exitBtn"
                data-resin-target="exit"
                data-testid="bp-annotations-controls-exit-btn"
                mode={AnnotationMode.NONE}
                onClick={handleExitClick}
                title={__('exit_annotations')}
            >
                <IconExit24 />
            </AnnotationsButton>
            <AnnotationsButton
                ref={annotationBtnRefs[AnnotationMode.DRAWING]}
                data-resin-target="draw"
                data-testid="bp-AnnotationsControls-drawBtn"
                isActive={isDrawingActive}
                isEnabled={showDrawing}
                mode={AnnotationMode.DRAWING}
                onClick={handleModeClick}
                title={__('drawing_comment')}
            >
                <IconPencilScribbleMedium24 />
            </AnnotationsButton>
            <AnnotationsTargetedTooltip isEnabled={showRegion}>
                <AnnotationsButton
                    ref={annotationBtnRefs[AnnotationMode.REGION]}
                    data-resin-target="highlightRegion"
                    data-testid="bp-AnnotationsControls-regionBtn"
                    isActive={isRegionActive}
                    isEnabled={showRegion}
                    mode={AnnotationMode.REGION}
                    onClick={handleModeClick}
                    title={__('region_comment')}
                >
                    <IconDashedSquareBubbleMedium24 />
                </AnnotationsButton>
            </AnnotationsTargetedTooltip>
            <AnnotationsButton
                ref={annotationBtnRefs[AnnotationMode.HIGHLIGHT]}
                data-resin-target="highlightText"
                data-testid="bp-AnnotationsControls-highlightBtn"
                isActive={annotationMode === AnnotationMode.HIGHLIGHT}
                isEnabled={showHighlight}
                mode={AnnotationMode.HIGHLIGHT}
                onClick={handleModeClick}
                title={__('highlight_text')}
            >
                <IconTextHighlightMedium24 />
            </AnnotationsButton>
        </div>
    );
}
