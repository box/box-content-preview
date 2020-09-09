import { AnnotationMode } from './AnnotationControls';

export enum AnnotationState {
    HIGHLIGHT = 'highlight',
    HIGHLIGHT_TEMP = 'highlight_temp',
    NONE = 'none',
    REGION = 'region',
    REGION_TEMP = 'region_temp',
}

export enum AnnotationInput {
    CANCEL = 'cancel',
    CLICK = 'click',
    CREATE = 'create',
    SUCCESS = 'success',
    UPDATE = 'update',
}

export const modeStateMap = {
    [AnnotationMode.HIGHLIGHT]: AnnotationState.HIGHLIGHT,
    [AnnotationMode.NONE]: AnnotationState.NONE,
    [AnnotationMode.REGION]: AnnotationState.REGION,
};

export const stateModeMap = {
    [AnnotationState.HIGHLIGHT]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.HIGHLIGHT_TEMP]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.NONE]: AnnotationMode.NONE,
    [AnnotationState.REGION]: AnnotationMode.REGION,
    [AnnotationState.REGION_TEMP]: AnnotationMode.REGION,
};

export default class AnnotationControlsFSM {
    private currentState = AnnotationState.NONE;

    public transition = (input: AnnotationInput, mode: AnnotationMode): AnnotationMode => {
        if (input === AnnotationInput.CLICK) {
            this.currentState = mode === stateModeMap[this.currentState] ? AnnotationState.NONE : modeStateMap[mode];
            return stateModeMap[this.currentState];
        }

        switch (this.currentState) {
            case AnnotationState.NONE:
                if (input === AnnotationInput.CREATE) {
                    this.currentState =
                        mode === AnnotationMode.HIGHLIGHT
                            ? AnnotationState.HIGHLIGHT_TEMP
                            : AnnotationState.REGION_TEMP;
                }
                break;
            case AnnotationState.HIGHLIGHT_TEMP:
            case AnnotationState.REGION_TEMP:
                if (input === AnnotationInput.CANCEL || input === AnnotationInput.SUCCESS) {
                    this.currentState = AnnotationState.NONE;
                }
                break;
            default:
        }

        return stateModeMap[this.currentState];
    };
}
