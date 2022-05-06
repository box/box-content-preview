export interface TargetingApi {
    canShow: boolean;
    onClose: () => void;
    onComplete: () => void;
    onShow: () => void;
}

interface PersistentOnboardingTargetingApi extends TargetingApi {
    onPrevious: () => void;
}

export interface Experiences {
    persistentOnboardingBoxEditAnnotations?: PersistentOnboardingTargetingApi;
    tooltipFlowAnnotations?: TargetingApi;
}
