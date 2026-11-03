import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import AnnotationsExitButtonV2 from './AnnotationsExitButtonV2';
import AnnotationsToggleV2, { ToolbarProps } from './AnnotationsToggleV2';
import { AnnotationMode } from '../../../types';

export type Props = Omit<ToolbarProps, 'buttonType'>;

// The markup controls at the end of a Blueprint controls bar
export default function AnnotationsControlsV2({ onAnnotationModeClick, ...rest }: Props): JSX.Element {
    const toggleRef = React.useRef<HTMLButtonElement | null>(null);

    const handleExit = (): void => {
        toggleRef.current?.focus();
        onAnnotationModeClick?.({ mode: AnnotationMode.NONE });
    };

    return (
        <>
            <Toolbar.Separator />
            <AnnotationsExitButtonV2 onClick={handleExit} />
            <AnnotationsToggleV2 ref={toggleRef} onAnnotationModeClick={onAnnotationModeClick} {...rest} />
        </>
    );
}
