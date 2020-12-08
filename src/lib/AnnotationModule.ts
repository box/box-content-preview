import {
    bdlBoxBlue,
    bdlGreenLight,
    bdlWatermelonRed,
    bdlYellorange,
    bdlYellow,
    bdlGrimace,
} from 'box-ui-elements/es/styles/variables';
import { ANNOTATION_COLOR_KEY } from './constants';
import Cache from './Cache';

export const AnnotationColor = {
    BOX_BLUE: bdlBoxBlue,
    GREEN_LIGHT: bdlGreenLight,
    WATERMELON_RED: bdlWatermelonRed,
    YELLORANGE: bdlYellorange,
    YELLOW: bdlYellow,
    GRIMACE: bdlGrimace,
};

type Options = {
    cache: Cache;
};

export default class AnnotationModule {
    private cache: Cache;

    constructor(options: Options) {
        this.cache = options.cache;

        if (!this.cache.get(ANNOTATION_COLOR_KEY)) {
            this.setColor(AnnotationColor.BOX_BLUE);
        }
    }

    public getColor = (): string => this.cache.get(ANNOTATION_COLOR_KEY) as string;

    public setColor = (color: string): void => this.cache.set(ANNOTATION_COLOR_KEY, color, true);
}