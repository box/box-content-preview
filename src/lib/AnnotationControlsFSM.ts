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
    STARTED = 'started',
    SUCCESS = 'success',
    UPDATE = 'update',
}

export const modeStateMap = {
    [AnnotationMode.HIGHLIGHT]: AnnotationState.HIGHLIGHT,
    [AnnotationMode.NONE]: AnnotationState.NONE,
    [AnnotationMode.REGION]: AnnotationState.REGION,
};

export const modeTempStateMap = {
    [AnnotationMode.HIGHLIGHT]: AnnotationState.HIGHLIGHT_TEMP,
    [AnnotationMode.NONE]: AnnotationState.NONE,
    [AnnotationMode.REGION]: AnnotationState.REGION_TEMP,
};

export const stateModeMap = {
    [AnnotationState.HIGHLIGHT]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.HIGHLIGHT_TEMP]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.NONE]: AnnotationMode.NONE,
    [AnnotationState.REGION]: AnnotationMode.REGION,
    [AnnotationState.REGION_TEMP]: AnnotationMode.REGION,
};

export default class AnnotationControlsFSM {
    private currentState: AnnotationState;

    constructor(initialState = AnnotationState.NONE) {
        this.currentState = initialState;
    }

    public getState = (): AnnotationState => this.currentState;

    public reset = (): void => {
        this.currentState = AnnotationState.NONE;
    };

    public transition = (input: AnnotationInput, mode: AnnotationMode = AnnotationMode.NONE): AnnotationMode => {
        if (input === AnnotationInput.CLICK) {
            this.currentState = mode === stateModeMap[this.currentState] ? AnnotationState.NONE : modeStateMap[mode];
            return stateModeMap[this.currentState];
        }

        switch (this.currentState) {
            case AnnotationState.NONE:
                if (input === AnnotationInput.CREATE || input === AnnotationInput.STARTED) {
                    this.currentState = modeTempStateMap[mode] || AnnotationState.NONE;
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
