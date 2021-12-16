import { decodeKeydown } from './util';

const FOCUSABLE_ELEMENTS = [
    'a[href]',
    'button',
    'textarea',
    'input[type="text"]',
    'input[type="radio"]',
    'input[type="checkbox"]',
    'select',
];
const ATTRIBUTES = ['disabled', 'tabindex="-1"', 'aria-disabled="true"'];
const FOCUSABLE_ELEMENTS_SELECTOR = FOCUSABLE_ELEMENTS.map(element => {
    let selector = element;
    ATTRIBUTES.forEach(attribute => {
        selector += `:not([${attribute}])`;
    });
    return selector;
}).join(', ');

function isButton(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'button';
}
function isVisible(element: HTMLElement): boolean {
    return element.offsetHeight > 0 && element.offsetWidth > 0;
}
function createFocusAnchor({ className = '' }): HTMLElement {
    const element = document.createElement('i');
    element.setAttribute('aria-hidden', 'true');
    element.tabIndex = 0;
    element.className = className;

    return element;
}

class FocusTrap {
    element: HTMLElement;

    firstFocusableElement: HTMLElement | null = null;

    lastFocusableElement: HTMLElement | null = null;

    trapFocusableElement: HTMLElement | null = null;

    constructor(element: HTMLElement) {
        if (!element) {
            throw new Error('FocusTrap needs an HTMLElement passed into the constructor');
        }

        this.element = element;
    }

    destroy(): void {
        this.disable();
    }

    focusFirstElement = (): void => {
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else if (this.trapFocusableElement) {
            this.trapFocusableElement.focus();
        }
    };

    focusLastElement = (): void => {
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[focusableElements.length - 1].focus();
        } else if (this.trapFocusableElement) {
            this.trapFocusableElement.focus();
        }
    };

    getFocusableElements = (): Array<HTMLElement> => {
        // Look for focusable elements
        const foundElements = this.element.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR);
        // Filter out the elements that are preview control buttons and not visible
        return Array.from(foundElements).filter(el => (isButton(el) && isVisible(el)) || !isButton(el));
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
            if (key === 'Tab') {
                this.focusFirstElement();
            } else {
                this.focusLastElement();
            }
            event.stopPropagation();
            event.preventDefault();
        }
    };

    enable(): void {
        this.element.addEventListener('keydown', this.handleKeydown);

        // Create focus anchors (beginning, end and trap)
        this.firstFocusableElement = createFocusAnchor({ className: 'FocusTrap-first' });
        this.lastFocusableElement = createFocusAnchor({ className: 'FocusTrap-last' });
        this.trapFocusableElement = createFocusAnchor({ className: 'FocusTrap-trap' });

        this.firstFocusableElement.addEventListener('focus', this.focusLastElement);
        this.lastFocusableElement.addEventListener('focus', this.focusFirstElement);
        this.trapFocusableElement.addEventListener('keydown', this.handleTrapKeydown);

        this.element.insertBefore(this.firstFocusableElement, this.element.firstElementChild);
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
