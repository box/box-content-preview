export type TargetingApi = {
    canShow: boolean;
    onClose: () => void;
    onComplete: () => void;
    onShow: () => void;
};

export type Experiences = {
    [key: string]: TargetingApi;
};
