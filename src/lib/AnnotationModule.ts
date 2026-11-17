import {
    BoxBlue100,
    GreenLight100,
    Grimace100,
    WatermelonRed100,
    Yellorange100,
    Yellow100,
} from '@box/blueprint-web-assets/tokens/tokens';
import Cache from './Cache';

export const ANNOTATION_COLOR_KEY = 'annotation-color';

export const AnnotationColor = {
    BOX_BLUE: BoxBlue100,
    GREEN_LIGHT: GreenLight100,
    WATERMELON_RED: WatermelonRed100,
    YELLORANGE: Yellorange100,
    YELLOW: Yellow100,
    GRIMACE: Grimace100,
};

export const ANNOTATION_COLORS = Object.values(AnnotationColor);

export default class AnnotationModule {
    private cache: Cache;

    constructor({ cache }: { cache: Cache }) {
        this.cache = cache;
    }

    public getColor = (): string => (this.cache.get(ANNOTATION_COLOR_KEY) as string) || AnnotationColor.BOX_BLUE;

    public setColor = (color: string): void => this.cache.set(ANNOTATION_COLOR_KEY, color, true);
}
