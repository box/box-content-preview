import noop from 'lodash/noop';

import { ICON_HIGHLIGHT_TEXT, ICON_REGION_COMMENT } from './icons/icons';
import Controls from './Controls';

export const CLASS_ANNOTATIONS_BUTTON = 'bp-AnnotationControls-button';
export const CLASS_ANNOTATIONS_GROUP = 'bp-AnnotationControls-group';
export const CLASS_HIGHLIGHT_BUTTON = 'bp-AnnotationControls-highlightBtn';
export const CLASS_REGION_BUTTON = 'bp-AnnotationControls-regionBtn';

export const CLASS_BUTTON_ACTIVE = 'is-active';
export const CLASS_GROUP_HIDE = 'is-hidden';

export enum AnnotationType {
    HIGHLIGHT = 'highlight',
    NONE = 'none',
    REGION = 'region',
}
export type ClickHandler = ({ event }: { event: MouseEvent }) => void;
export type Options = {
    fileId: string;
    onEscape?: () => void;
    onHighlightClick?: ClickHandler;
    onRegionClick?: ClickHandler;
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
    [AnnotationType.HIGHLIGHT]: CLASS_HIGHLIGHT_BUTTON,
    [AnnotationType.REGION]: CLASS_REGION_BUTTON,
};
const buttonPropsMap: { [key: string]: ButtonProps } = {
    [AnnotationType.HIGHLIGHT]: {
        classname: `${CLASS_ANNOTATIONS_BUTTON} ${CLASS_HIGHLIGHT_BUTTON}`,
        icon: ICON_HIGHLIGHT_TEXT,
        resinTarget: 'highlightText',
        testid: 'bp-AnnotationsControls-highlightBtn',
        text: __('highlight_text'),
    },
    [AnnotationType.REGION]: {
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

    private activeType: AnnotationType = AnnotationType.NONE;

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
        if (this.activeType === AnnotationType.NONE) {
            return;
        }

        const prevType = this.activeType;

        this.activeType = AnnotationType.NONE;
        this.updateButton(prevType);
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
    private updateButton = (type: AnnotationType): void => {
        const buttonElement = this.controlsElement.querySelector(`.${buttonClassMap[type]}`);

        if (!buttonElement) {
            return;
        }

        if (this.activeType === type) {
            buttonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            buttonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }
    };

    /**
     * Set the type. If the type is different from what is currently saved in state,
     * then reset the current controls and apply the active state based on the provided type.
     */
    public setActive(type: AnnotationType): void {
        // Only update buttons if type has changed
        if (this.activeType === type) {
            return;
        }

        this.resetControls();
        this.activeType = type;
        this.updateButton(type);
    }

    /**
     * Annotation control button click handler
     */
    private handleClick = (onClick: ClickHandler, type: AnnotationType) => (event: MouseEvent): void => {
        const prevType = this.activeType;
        this.resetControls();

        if (prevType !== type) {
            this.activeType = type as AnnotationType;
            this.updateButton(type);
        }

        onClick({ event });
    };

    /**
     * Escape key handler, reset all control buttons,
     * and stop propagation to prevent preview modal from exiting
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape' || this.activeType === AnnotationType.NONE) {
            return;
        }

        this.resetControls();
        this.onEscape();

        event.preventDefault();
        event.stopPropagation();
    };

    private addButton = (type: AnnotationType, handler: ClickHandler, parent: HTMLElement, fileId: string): void => {
        const buttonProps = buttonPropsMap[type];

        if (!buttonProps) {
            return;
        }

        const buttonElement = this.controls.add(
            buttonProps.text,
            this.handleClick(handler, type),
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
        onEscape = noop,
        onRegionClick = noop,
        onHighlightClick = noop,
        showHighlightText = false,
    }: Options): void {
        if (this.hasInit) {
            return;
        }
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        groupElement.setAttribute('data-resin-feature', 'annotations');

        this.addButton(AnnotationType.REGION, onRegionClick, groupElement, fileId);
        if (showHighlightText) {
            this.addButton(AnnotationType.HIGHLIGHT, onHighlightClick, groupElement, fileId);
        }

        this.onEscape = onEscape;
        document.addEventListener('keydown', this.handleKeyDown);

        this.hasInit = true;
    }
}
