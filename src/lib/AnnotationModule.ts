import {
    bdlBoxBlue,
    bdlGreenLight,
    bdlWatermelonRed,
    bdlYellorange,
    bdlYellow,
    bdlGrimace,
} from 'box-ui-elements/es/styles/variables';
import Cache from './Cache';

export const ANNOTATION_COLOR_KEY = 'annotation-color';

export const AnnotationColor = {
    BOX_BLUE: bdlBoxBlue,
    GREEN_LIGHT: bdlGreenLight,
    WATERMELON_RED: bdlWatermelonRed,
    YELLORANGE: bdlYellorange,
    YELLOW: bdlYellow,
    GRIMACE: bdlGrimace,
};

export const ANNOTATION_COLORS = Object.values(AnnotationColor);

export default class AnnotationModule {
    private cache: Cache;

    constructor({ cache }: { cache: Cache }) {
        this.cache = cache;
    }

    public getColor = (): string => (this.cache.get(ANNOTATION_COLOR_KEY) as string) || bdlBoxBlue;

    public setColor = (color: string): void => this.cache.set(ANNOTATION_COLOR_KEY, color, true);
}
