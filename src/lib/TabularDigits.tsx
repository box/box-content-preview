import React from 'react';
import './TabularDigits.scss';

// The Inter subset served to the app has no tabular figures, so `font-variant-numeric: tabular-nums`
// has no effect. Wrapping each digit in a 1ch box keeps changing numbers, and whatever follows them,
// from shifting as they update.
export const TABULAR_DIGIT_CLASS = 'bp-TabularDigit';
export const TABULAR_DIGITS_BOXES_CLASS = 'bp-TabularDigits-boxes';
export const TABULAR_DIGITS_TEXT_CLASS = 'bp-TabularDigits-text';

const isDigit = (char: string): boolean => char >= '0' && char <= '9';

const isDigitNode = (node: ChildNode): boolean => node.nodeType === Node.ELEMENT_NODE;

// Screen readers would read the boxed digits one by one, so the boxes are hidden from them and a visually
// hidden copy gives them the whole text
const getParts = (el: HTMLElement): { boxesEl: HTMLElement; textEl: HTMLElement } => {
    const boxesEl = el.firstElementChild as HTMLElement | null;
    const textEl = el.lastElementChild as HTMLElement | null;

    if (
        el.childNodes.length === 2 &&
        boxesEl?.classList.contains(TABULAR_DIGITS_BOXES_CLASS) &&
        textEl?.classList.contains(TABULAR_DIGITS_TEXT_CLASS)
    ) {
        return { boxesEl, textEl };
    }

    const newBoxesEl = document.createElement('span');
    newBoxesEl.className = TABULAR_DIGITS_BOXES_CLASS;
    newBoxesEl.setAttribute('aria-hidden', 'true');

    const newTextEl = document.createElement('span');
    newTextEl.className = TABULAR_DIGITS_TEXT_CLASS;

    el.replaceChildren(newBoxesEl, newTextEl);

    return { boxesEl: newBoxesEl, textEl: newTextEl };
};

/**
 * Writes `text` into `el` with each digit in a fixed-width box, plus a visually hidden copy of `text` for
 * screen readers. For labels updated outside React, e.g. on animation frames. This replaces the children
 * of `el`, so `el` must not hold other content. Unchanged characters are left in place, so a ticking clock
 * only touches the digits that changed.
 */
export function renderTabularDigits(el: HTMLElement, text: string): void {
    const { boxesEl, textEl } = getParts(el);

    if (textEl.textContent === text) {
        return;
    }

    textEl.textContent = text;

    const chars = Array.from(text);
    const nodes = boxesEl.childNodes;
    const canPatch =
        nodes.length === chars.length && chars.every((char, index) => isDigit(char) === isDigitNode(nodes[index]));

    if (canPatch) {
        chars.forEach((char, index) => {
            if (nodes[index].textContent !== char) {
                nodes[index].textContent = char;
            }
        });
        return;
    }

    const fragment = document.createDocumentFragment();

    chars.forEach(char => {
        if (isDigit(char)) {
            const digitEl = document.createElement('span');
            digitEl.className = TABULAR_DIGIT_CLASS;
            digitEl.textContent = char;
            fragment.appendChild(digitEl);
        } else {
            fragment.appendChild(document.createTextNode(char));
        }
    });

    boxesEl.replaceChildren(fragment);
}

export type Props = {
    children: string;
};

/**
 * Renders `children` with each digit in a fixed-width box. Place it inside the element that
 * provides the typography, e.g. `<Text as="span"><TabularDigits>{label}</TabularDigits></Text>`.
 */
export default function TabularDigits({ children }: Props): JSX.Element {
    const elRef = React.useRef<HTMLSpanElement>(null);

    React.useLayoutEffect(() => {
        if (elRef.current) {
            renderTabularDigits(elRef.current, children);
        }
    }, [children]);

    return <span ref={elRef} />;
}
