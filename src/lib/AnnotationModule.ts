import { ANNOTATION_COLOR_KEY } from './constants';
import Cache from './Cache';

export enum AnnotationColor {
    BLUE = '#0061d5',
    GREEN_LIGHT = '#26c281',
    GRIMACE = '#4826c2',
    WATERMELON_RED = '#ed3757',
    YELLORANGE = '#f5b31b',
    YELLOW = '#ffd700',
}

type Subscription = (state: AnnotationColor) => void;

export default class AnnotationModule {
    private cache: Cache;

    private subscriptions: Subscription[] = [];

    constructor(cache = new Cache()) {
        this.cache = cache;

        if (!this.cache.get(ANNOTATION_COLOR_KEY)) {
            this.cache.set(ANNOTATION_COLOR_KEY, AnnotationColor.BLUE, true);
        }
    }

    public getColor = (): AnnotationColor => this.cache.get(ANNOTATION_COLOR_KEY) as AnnotationColor;

    public transition = (color: AnnotationColor): AnnotationColor => {
        this.setColor(color);
        return color;
    };

    public subscribe = (callback: Subscription): void => {
        this.subscriptions.push(callback);
    };

    public unsubscribe = (callback: Subscription): void => {
        this.subscriptions = this.subscriptions.filter(subscription => subscription !== callback);
    };

    private notify = (): void =>
        this.subscriptions.forEach(callback => callback(this.cache.get(ANNOTATION_COLOR_KEY) as AnnotationColor));

    private setColor = (color: AnnotationColor): void => {
        this.cache.set(ANNOTATION_COLOR_KEY, color, true);
        this.notify();
    };
}
