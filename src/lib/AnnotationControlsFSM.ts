import { AnnotationMode } from './types';

export * from './types';

export enum AnnotationState {
    DRAWING = 'drawing',
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
    RESET = 'reset',
    STARTED = 'started',
    SUCCESS = 'success',
    UPDATE = 'update',
}

type Subscription = (state: AnnotationState) => void;

export const modeStateMap = {
    [AnnotationMode.DRAWING]: AnnotationState.DRAWING,
    [AnnotationMode.HIGHLIGHT]: AnnotationState.HIGHLIGHT,
    [AnnotationMode.NONE]: AnnotationState.NONE,
    [AnnotationMode.REGION]: AnnotationState.REGION,
};

export const modeTempStateMap = {
    [AnnotationMode.DRAWING]: AnnotationState.NONE,
    [AnnotationMode.HIGHLIGHT]: AnnotationState.HIGHLIGHT_TEMP,
    [AnnotationMode.NONE]: AnnotationState.NONE,
    [AnnotationMode.REGION]: AnnotationState.REGION_TEMP,
};

export const stateModeMap = {
    [AnnotationState.DRAWING]: AnnotationMode.DRAWING,
    [AnnotationState.HIGHLIGHT]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.HIGHLIGHT_TEMP]: AnnotationMode.HIGHLIGHT,
    [AnnotationState.NONE]: AnnotationMode.NONE,
    [AnnotationState.REGION]: AnnotationMode.REGION,
    [AnnotationState.REGION_TEMP]: AnnotationMode.REGION,
};

export default class AnnotationControlsFSM {
    private currentState: AnnotationState;

    private subscriptions: Subscription[] = [];

    constructor(initialState = AnnotationState.NONE) {
        this.currentState = initialState;
    }

    public getMode = (): AnnotationMode => stateModeMap[this.currentState];

    public getState = (): AnnotationState => this.currentState;

    public subscribe = (callback: Subscription): void => {
        this.subscriptions.push(callback);
    };

    public transition = (input: AnnotationInput, mode: AnnotationMode = AnnotationMode.NONE): AnnotationMode => {
        let newState = this.currentState;

        if (input === AnnotationInput.CLICK) {
            newState = mode === stateModeMap[this.currentState] ? AnnotationState.NONE : modeStateMap[mode];
        } else if (input === AnnotationInput.RESET) {
            newState = AnnotationState.NONE;
        } else {
            switch (this.currentState) {
                case AnnotationState.NONE:
                    if (input === AnnotationInput.CREATE || input === AnnotationInput.STARTED) {
                        newState = modeTempStateMap[mode] || AnnotationState.NONE;
                    }
                    break;
                case AnnotationState.HIGHLIGHT_TEMP:
                case AnnotationState.REGION_TEMP:
                    if (input === AnnotationInput.CANCEL || input === AnnotationInput.SUCCESS) {
                        newState = AnnotationState.NONE;
                    }
                    break;
                default:
            }
        }

        this.setState(newState);
        return stateModeMap[this.currentState];
    };

    public unsubscribe = (callback: Subscription): void => {
        this.subscriptions = this.subscriptions.filter(subscription => subscription !== callback);
    };

    private notify = (): void => this.subscriptions.forEach(callback => callback(this.currentState));

    private setState = (state: AnnotationState): void => {
        this.currentState = state;
        this.notify();
    };
}
