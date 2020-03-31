import noop from 'lodash/noop';
import { ICON_REGION_COMMENT } from './icons/icons';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from './Controls';
import fullscreen from './Fullscreen';

export const CLASS_ANNOTATIONS_GROUP = 'bp-AnnotationControls-group';
export const CLASS_REGION_BUTTON = 'bp-AnnotationControls-regionBtn';

export const CLASS_BUTTON_ACTIVE = 'is-active';
export const CLASS_GROUP_HIDE = 'is-hidden';

export type RegionHandler = ({ isRegionActive, event }: { isRegionActive: boolean; event: MouseEvent }) => void;
export type Options = {
    onRegionClick?: RegionHandler;
};

declare const __: (key: string) => string;

export default class AnnotationControls {
    /** @property {Controls} - Controls object */
    private controls: Controls;

    /** @property {HTMLElement} - Controls element */
    private controlsElement: HTMLElement;

    /** @property {boolean} - Region comment mode active state */
    private isRegionActive = false;

    /**
     * [constructor]
     */
    constructor(controls: Controls) {
        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;
        this.controlsElement = controls.controlsEl;

        this.attachEventHandlers();
    }

    /**
     * [destructor]
     */
    public destroy(): void {
        fullscreen.removeListener('enter', this.handleFullscreenEnter);
        fullscreen.removeListener('exit', this.handleFullscreenExit);
    }

    /**
     * Attaches event handlers
     */
    private attachEventHandlers(): void {
        fullscreen.addListener('enter', this.handleFullscreenEnter);
        fullscreen.addListener('exit', this.handleFullscreenExit);
    }

    /**
     * Handle fullscreen change
     */
    private handleFullscreenChange = (isFullscreen: boolean): void => {
        const groupElement = this.controlsElement.querySelector(`.${CLASS_ANNOTATIONS_GROUP}`);

        if (!groupElement) {
            return;
        }

        if (isFullscreen) {
            groupElement.classList.add(CLASS_GROUP_HIDE);
        } else {
            groupElement.classList.remove(CLASS_GROUP_HIDE);
        }
    };

    /**
     * Enter fullscreen handler
     */
    private handleFullscreenEnter = (): void => this.handleFullscreenChange(true);

    /**
     * Exit fullscreen handler
     */
    private handleFullscreenExit = (): void => this.handleFullscreenChange(false);

    /**
     * Region comment button click handler
     */
    private handleRegionClick = (onRegionClick: RegionHandler) => (event: MouseEvent): void => {
        const regionButtonElement = this.controlsElement.querySelector(`.${CLASS_REGION_BUTTON}`);

        if (regionButtonElement) {
            this.isRegionActive = !this.isRegionActive;
            if (this.isRegionActive) {
                regionButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
            } else {
                regionButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
            }
        }

        onRegionClick({ isRegionActive: this.isRegionActive, event });
    };

    /**
     * Initialize the annotation controls with options.
     */
    public init({ onRegionClick = noop }: Options = {}): void {
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        this.controls.add(
            __('region_comment'),
            this.handleRegionClick(onRegionClick),
            `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_REGION_BUTTON}`,
            ICON_REGION_COMMENT,
            'button',
            groupElement,
        );
    }
}
