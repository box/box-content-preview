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

    /** @property {boolean} - Region comment mode active state */
    private isRegionActive = false;

    /**
     * [constructor]
     *
     * @param {Controls} controls - Viewer controls
     * @return {AnnotationControls} Instance of AnnotationControls
     */
    constructor(controls: Controls) {
        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;

        this.attachEventHandlers();
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    public destroy(): void {
        if (fullscreen) {
            fullscreen.removeAllListeners();
        }
    }

    /**
     * Attaches event handlers
     *
     * @return {void}
     */
    private attachEventHandlers = (): void => {
        fullscreen.addListener('enter', () => this.handleFullscreenChange(true));
        fullscreen.addListener('exit', () => this.handleFullscreenChange(false));
    };

    /**
     * Hide annotations control button group
     *
     * @param {boolean} isFullscreen - true if full screen will be active
     * @return {void}
     */
    private handleFullscreenChange = (isFullscreen: boolean): void => {
        const groupElement = this.controls.controlsEl.querySelector(`.${CLASS_ANNOTATIONS_GROUP}`);

        if (isFullscreen) {
            groupElement.classList.add(CLASS_GROUP_HIDE);
        } else {
            groupElement.classList.remove(CLASS_GROUP_HIDE);
        }
    };

    /**
     * Region comment button click handler
     *
     * @param {RegionHandler} onRegionClick - region click handler in options
     * @param {MouseEvent} event - mouse event
     * @return {void}
     */
    private handleRegionClick = (onRegionClick: RegionHandler) => (event: MouseEvent): void => {
        const regionButtonElement = event.target as HTMLButtonElement;

        this.isRegionActive = !this.isRegionActive;
        if (this.isRegionActive) {
            regionButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            regionButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }

        onRegionClick({ isRegionActive: this.isRegionActive, event });
    };

    /**
     * Initialize the annotation controls with options.
     *
     * @param {RegionHandler} [options.onRegionClick] - Callback when region comment button is clicked
     * @return {void}
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
