import noop from 'lodash/noop';

import { ICON_HIGHLIGHT_TEXT, ICON_REGION_COMMENT } from './icons/icons';
import Controls from './Controls';

export const CLASS_ANNOTATIONS_BUTTON = 'bp-AnnotationControls-button';
export const CLASS_ANNOTATIONS_GROUP = 'bp-AnnotationControls-group';
export const CLASS_HIGHLIGHT_BUTTON = 'bp-AnnotationControls-highlightBtn';
export const CLASS_REGION_BUTTON = 'bp-AnnotationControls-regionBtn';

export const CLASS_BUTTON_ACTIVE = 'is-active';
export const CLASS_GROUP_HIDE = 'is-hidden';

export enum AnnotationMode {
    DRAWING = 'drawing',
    HIGHLIGHT = 'highlight',
    NONE = 'none',
    REGION = 'region',
}
export type ClickHandler = ({ event, mode }: { event: MouseEvent; mode: AnnotationMode }) => void;
export type Options = {
    fileId: string;
    initialMode?: AnnotationMode;
    onClick?: ClickHandler;
    onEscape?: () => void;
    showHighlightText: boolean;
};

type ButtonProps = {
    classname: string;
    icon: string;
    resinTarget: string;
    testid: string;
    text: string;
};

declare const __: (key: string) => string;

const buttonClassMap: { [key: string]: string } = {
    [AnnotationMode.HIGHLIGHT]: CLASS_HIGHLIGHT_BUTTON,
    [AnnotationMode.REGION]: CLASS_REGION_BUTTON,
};
const buttonPropsMap: { [key: string]: ButtonProps } = {
    [AnnotationMode.HIGHLIGHT]: {
        classname: `${CLASS_ANNOTATIONS_BUTTON} ${CLASS_HIGHLIGHT_BUTTON}`,
        icon: ICON_HIGHLIGHT_TEXT,
        resinTarget: 'highlightText',
        testid: 'bp-AnnotationsControls-highlightBtn',
        text: __('highlight_text'),
    },
    [AnnotationMode.REGION]: {
        classname: `${CLASS_ANNOTATIONS_BUTTON} ${CLASS_REGION_BUTTON}`,
        icon: ICON_REGION_COMMENT,
        resinTarget: 'highlightRegion',
        testid: 'bp-AnnotationsControls-regionBtn',
        text: __('region_comment'),
    },
};

export default class AnnotationControls {
    private controls: Controls;

    private controlsElement: HTMLElement;

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
    }

    /**
     * [destructor]
     */
    public destroy(): void {
        if (!this.hasInit) {
            return;
        }

        document.removeEventListener('keydown', this.handleKeyDown);

        this.hasInit = false;
    }

    /**
     * Deactivate current control button
     */
    public resetControls = (): void => {
        if (this.currentMode === AnnotationMode.NONE) {
            return;
        }

        const prevMode = this.currentMode;

        this.currentMode = AnnotationMode.NONE;
        this.updateButton(prevMode);
    };

    /**
     * Show or hide the controls
     */
    public toggle(show: boolean): void {
        const groupElement = this.controlsElement.querySelector(`.${CLASS_ANNOTATIONS_GROUP}`);

        if (!groupElement) {
            return;
        }

        if (show) {
            groupElement.classList.remove(CLASS_GROUP_HIDE);
        } else {
            groupElement.classList.add(CLASS_GROUP_HIDE);
        }
    }

    /**
     * Update button UI
     */
    private updateButton = (mode: AnnotationMode): void => {
        const buttonElement = this.controlsElement.querySelector(`.${buttonClassMap[mode]}`);

        if (!buttonElement) {
            return;
        }

        if (this.currentMode === mode) {
            buttonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            buttonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }
    };

    /**
     * Set the mode. If the mode is different from what is currently saved in state,
     * then reset the current controls and apply the active state based on the provided mode.
     */
    public setMode(mode: AnnotationMode): void {
        // Only update buttons if mode has changed
        if (this.currentMode === mode) {
            return;
        }

        this.resetControls();
        this.currentMode = mode;
        this.updateButton(mode);
    }

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

    private addButton = (mode: AnnotationMode, onClick: ClickHandler, parent: HTMLElement, fileId: string): void => {
        const buttonProps = buttonPropsMap[mode];

        if (!buttonProps) {
            return;
        }

        const buttonElement = this.controls.add(
            buttonProps.text,
            (event: MouseEvent) => onClick({ event, mode }),
            buttonProps.classname,
            buttonProps.icon,
            'button',
            parent,
        );

        buttonElement.setAttribute('data-resin-target', buttonProps.resinTarget);
        buttonElement.setAttribute('data-resin-fileId', fileId);
        buttonElement.setAttribute('data-testid', buttonProps.testid);
    };

    /**
     * Initialize the annotation controls with options.
     */
    public init({
        fileId,
        initialMode = AnnotationMode.NONE,
        onEscape = noop,
        onClick = noop,
        showHighlightText = false,
    }: Options): void {
        if (this.hasInit) {
            return;
        }
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        groupElement.setAttribute('data-resin-feature', 'annotations');

        this.addButton(AnnotationMode.REGION, onClick, groupElement, fileId);
        if (showHighlightText) {
            this.addButton(AnnotationMode.HIGHLIGHT, onClick, groupElement, fileId);
        }

        this.onEscape = onEscape;
        document.addEventListener('keydown', this.handleKeyDown);

        this.hasInit = true;

        this.setMode(initialMode);
    }
}
