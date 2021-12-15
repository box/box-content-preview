import { decodeKeydown } from './util';

const FOCUSABLE_ELEMENTS = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
];

function isButton(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'button';
}
function isVisible(element: HTMLElement): boolean {
    return element.offsetHeight > 0 && element.offsetWidth > 0;
}
function createFocusAnchor(): HTMLElement {
    const element = document.createElement('i');
    element.setAttribute('aria-hidden', 'true');
    element.tabIndex = 0;

    return element;
}

class FocusTrap {
    element: HTMLElement;

    firstFocusableElement: HTMLElement | null = null;

    lastFocusableElement: HTMLElement | null = null;

    trapFocusableElement: HTMLElement | null = null;

    constructor(element: HTMLElement) {
        this.element = element;
    }

    destroy(): void {
        this.disable();
    }

    focusFirstElement = (): void => {
        if (!this.element) {
            return;
        }

        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else if (this.trapFocusableElement) {
            this.trapFocusableElement.focus();
        }
    };

    focusLastElement = (): void => {
        if (!this.element) {
            return;
        }

        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[focusableElements.length - 1].focus();
        } else if (this.trapFocusableElement) {
            this.trapFocusableElement.focus();
        }
    };

    getFocusableElements = (): Array<HTMLElement> => {
        // Look for focusable elements
        const foundElements = this.element.querySelectorAll(FOCUSABLE_ELEMENTS.join(', '));
        // Filter out the elements that are preview control buttons and not visible
        return Array.prototype.slice.call(foundElements).filter(el => (isButton(el) && isVisible(el)) || !isButton(el));
    };

    handleTrapKeydown = (event: KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const isTabPressed = key === 'Tab' || key === 'Shift+Tab';

        if (!isTabPressed) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
    };

    handleKeydown = (event: KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const isTabPressed = key === 'Tab' || key === 'Shift+Tab';

        if (this.element === document.activeElement && isTabPressed) {
            this.focusFirstElement();
            event.stopPropagation();
            event.preventDefault();
        }
    };

    enable(): void {
        this.element.addEventListener('keydown', this.handleKeydown);

        // Create focus anchors (beginning, end and trap)
        this.firstFocusableElement = createFocusAnchor();
        this.lastFocusableElement = createFocusAnchor();
        this.trapFocusableElement = createFocusAnchor();

        this.firstFocusableElement.addEventListener('focus', this.focusLastElement);
        this.lastFocusableElement.addEventListener('focus', this.focusFirstElement);
        this.trapFocusableElement.addEventListener('keydown', this.handleTrapKeydown);

        this.element.prepend(this.firstFocusableElement);
        this.element.append(this.lastFocusableElement);
        this.element.append(this.trapFocusableElement);
    }

    disable(): void {
        this.element.removeEventListener('keydown', this.handleKeydown);

        if (this.firstFocusableElement) {
            this.element.removeChild(this.firstFocusableElement);
        }

        if (this.lastFocusableElement) {
            this.element.removeChild(this.lastFocusableElement);
        }

        if (this.trapFocusableElement) {
            this.element.removeChild(this.trapFocusableElement);
        }

        this.firstFocusableElement = null;
        this.lastFocusableElement = null;
        this.trapFocusableElement = null;
    }
}

export default FocusTrap;
