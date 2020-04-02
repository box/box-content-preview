import noop from 'lodash/noop';

import { ANNOTATION_MODE } from './constants';
import { ICON_REGION_COMMENT } from './icons/icons';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from './Controls';
import fullscreen from './Fullscreen';

export const CLASS_ANNOTATIONS_GROUP = 'bp-AnnotationControls-group';
export const CLASS_REGION_BUTTON = 'bp-AnnotationControls-regionBtn';

export const CLASS_BUTTON_ACTIVE = 'is-active';
export const CLASS_GROUP_HIDE = 'is-hidden';

export type AnnotationMode = 'draw' | 'highlight' | 'region' | null;
export type RegionHandler = ({ activeControl, event }: { activeControl: AnnotationMode; event: MouseEvent }) => void;
export type Options = {
    onRegionClick?: RegionHandler;
};

declare const __: (key: string) => string;

interface ControlsMap {
    [key: string]: () => void;
}

export default class AnnotationControls {
    private controls: Controls;

    private controlsElement: HTMLElement;

    private controlsMap: ControlsMap;

    private currentActiveControl: AnnotationMode = null;

    /**
     * [constructor]
     */
    constructor(controls: Controls) {
        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;
        this.controlsElement = controls.controlsEl;
        this.controlsMap = {
            [ANNOTATION_MODE.region]: this.updateRegionButton,
        };

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
     * Deactive current control button
     */
    public deactivateCurrentControl = (): void => {
        if (!this.currentActiveControl) {
            return;
        }

        const updateButton = this.controlsMap[this.currentActiveControl];

        this.currentActiveControl = null;
        updateButton();
    };

    /**
     * Update region button UI
     */
    private updateRegionButton = (): void => {
        const regionButtonElement = this.controlsElement.querySelector(`.${CLASS_REGION_BUTTON}`);

        if (regionButtonElement) {
            if (this.currentActiveControl === ANNOTATION_MODE.region) {
                regionButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
            } else {
                regionButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
            }
        }
    };

    /**
     * Region comment button click handler
     */
    private handleRegionClick = (onRegionClick: RegionHandler) => (event: MouseEvent): void => {
        const activeControl = this.currentActiveControl;

        this.deactivateCurrentControl();

        if (activeControl !== ANNOTATION_MODE.region) {
            this.currentActiveControl = ANNOTATION_MODE.region as AnnotationMode;
            this.updateRegionButton();
        }

        onRegionClick({ activeControl: this.currentActiveControl, event });
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
