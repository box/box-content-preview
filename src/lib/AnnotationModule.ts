import { ANNOTATION_COLOR_KEY } from './constants';
import Cache from './Cache';

export enum AnnotationColor {
    BLUE = '#0061d5',
    GREEN_LIGHT = '#26c281',
    WATERMELON_RED = '#ed3757',
    YELLORANGE = '#f5b31b',
    YELLOW = '#ffd700',
    GRIMACE = '#4826c2',
}

type Options = {
    cache: Cache;
};

export default class AnnotationModule {
    private cache: Cache;

    constructor(options: Options) {
        this.cache = options.cache;

        if (!this.cache.get(ANNOTATION_COLOR_KEY)) {
            this.setColor(AnnotationColor.BLUE);
        }
    }

    public getColor = (): AnnotationColor => this.cache.get(ANNOTATION_COLOR_KEY) as AnnotationColor;

    public setColor = (color: AnnotationColor): void => this.cache.set(ANNOTATION_COLOR_KEY, color, true);
}
