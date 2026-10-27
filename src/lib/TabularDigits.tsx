import React from 'react';
import { VisuallyHidden } from '@box/blueprint-web';
import './TabularDigits.scss';

// The Inter subset served to the app has no tabular figures, so `font-variant-numeric: tabular-nums`
// has no effect. Wrapping each digit in a 1ch box keeps changing numbers, and whatever follows them,
// from shifting as they update.
export const TABULAR_DIGIT_CLASS = 'bp-TabularDigit';

const isDigit = (char: string): boolean => char >= '0' && char <= '9';

const isDigitNode = (node: ChildNode): boolean => node.nodeType === Node.ELEMENT_NODE;

/**
 * Writes `text` into `el` with each digit in a fixed-width box. For labels updated outside React,
 * e.g. on animation frames. Unchanged characters are left in place, so a ticking clock only touches
 * the digits that changed.
 */
export function renderTabularDigits(el: HTMLElement, text: string): void {
    if (el.textContent === text) {
        return;
    }

    const chars = Array.from(text);
    const nodes = el.childNodes;
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

    el.replaceChildren(fragment);
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

    // Screen readers would read the boxed digits one by one, so they get the whole text from a hidden copy
    return (
        <>
            <span ref={elRef} aria-hidden />
            <VisuallyHidden>{children}</VisuallyHidden>
        </>
    );
}
