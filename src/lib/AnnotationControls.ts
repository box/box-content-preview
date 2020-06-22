import noop from 'lodash/noop';

import { ICON_REGION_COMMENT } from './icons/icons';
import Controls from './Controls';
import fullscreen from './Fullscreen';

export const CLASS_ANNOTATIONS_GROUP = 'bp-AnnotationControls-group';
export const CLASS_REGION_BUTTON = 'bp-AnnotationControls-regionBtn';

export const CLASS_BUTTON_ACTIVE = 'is-active';
export const CLASS_GROUP_HIDE = 'is-hidden';

export enum AnnotationMode {
    NONE = 'none',
    REGION = 'region',
}
export type ClickHandler = ({ activeControl, event }: { activeControl: AnnotationMode; event: MouseEvent }) => void;
export type Options = {
    onRegionClick?: ClickHandler;
    onEscape?: () => void;
};

declare const __: (key: string) => string;

interface ControlsMap {
    [key: string]: () => void;
}

export default class AnnotationControls {
    private controls: Controls;

    private controlsElement: HTMLElement;

    private controlsMap: ControlsMap;

    private currentMode: AnnotationMode = AnnotationMode.NONE;

    private hasInit = false;

    private onEscape: () => void = noop;

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
            [AnnotationMode.REGION]: this.updateRegionButton,
        };

        this.attachEventHandlers();
    }

    /**
     * [destructor]
     */
    public destroy(): void {
        if (!this.hasInit) {
            return;
        }
        fullscreen.removeListener('enter', this.handleFullscreenEnter);
        fullscreen.removeListener('exit', this.handleFullscreenExit);
        document.removeEventListener('keydown', this.handleKeyDown);

        this.hasInit = false;
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

    public getActiveMode = (): AnnotationMode => {
        return this.currentMode;
    };

    /**
     * Deactivate current control button
     */
    public resetControls = (): void => {
        if (this.currentMode === AnnotationMode.NONE) {
            return;
        }

        const updateButton = this.controlsMap[this.currentMode];

        this.currentMode = AnnotationMode.NONE;
        updateButton();
    };

    /**
     * Update region button UI
     */
    private updateRegionButton = (): void => {
        const regionButtonElement = this.controlsElement.querySelector(`.${CLASS_REGION_BUTTON}`);

        if (!regionButtonElement) {
            return;
        }

        if (this.currentMode === AnnotationMode.REGION) {
            regionButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            regionButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }
    };

    /**
     * Region comment button click handler
     */
    private handleClick = (onClick: ClickHandler, mode: AnnotationMode) => (event: MouseEvent): void => {
        const prevActiveControl = this.currentMode;

        this.resetControls();

        if (prevActiveControl !== mode) {
            this.currentMode = mode as AnnotationMode;
            this.controlsMap[mode]();
        }

        onClick({ activeControl: this.currentMode, event });
    };

    /**
     * Escape key handler, reset all control buttons,
     * and stop propagation to prevent preview modal from exiting
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape' || this.currentMode === AnnotationMode.NONE) {
            return;
        }

        this.resetControls();
        this.onEscape();

        event.preventDefault();
        event.stopPropagation();
    };

    /**
     * Initialize the annotation controls with options.
     */
    public init({ onRegionClick = noop, onEscape = noop }: Options = {}): void {
        if (this.hasInit) {
            return;
        }
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        const regionButton = this.controls.add(
            __('region_comment'),
            this.handleClick(onRegionClick, AnnotationMode.REGION),
            CLASS_REGION_BUTTON,
            ICON_REGION_COMMENT,
            'button',
            groupElement,
        );

        regionButton.setAttribute('data-testid', 'bp-AnnotationsControls-regionBtn');

        this.onEscape = onEscape;
        document.addEventListener('keydown', this.handleKeyDown);

        this.hasInit = true;
    }
}
