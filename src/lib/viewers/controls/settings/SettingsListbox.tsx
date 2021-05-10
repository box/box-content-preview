import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import uniqueId from 'lodash/uniqueId';
import { decodeKeydown } from '../../../util';
import './SettingsListbox.scss';

export type ListboxItem = {
    label: string;
    value: string;
};

export type Props = {
    className?: string;
    label: string;
    listItems: Array<ListboxItem>;
    onSelect: () => void;
    value?: string;
};

export default function SettingsListbox({ className, label, listItems, onSelect, value }: Props): JSX.Element {
    const { current: id } = React.useRef(uniqueId('bp-SettingsListbox_'));
    const overlayElRef = React.useRef<HTMLDivElement | null>(null);
    const listboxRef = React.useRef<HTMLUListElement | null>(null);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [activeItem, setActiveItem] = React.useState<HTMLLIElement | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleButtonClick = (): void => setIsOpen(!isOpen);
    const handleSelect = (selectedOption: string): void => {
        setIsOpen(false);
        onSelect(selectedOption);
    };
    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const max = listItems.length - 1;

        if (key === 'ArrowUp' && activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }

        if (key === 'ArrowDown' && activeIndex < max) {
            setActiveIndex(activeIndex + 1);
        }

        if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    const createKeyDownHandler = (selectedOption: string) => (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key !== 'Space' && key !== 'Enter') {
            return;
        }

        handleSelect(selectedOption);
    };

    React.useEffect(() => {
        const { current: listboxEl } = listboxRef;
        if (isOpen && listboxEl) {
            listboxEl.focus();
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (activeItem && isOpen) {
            activeItem.focus();
        }
    }, [activeItem, isOpen]);

    React.useEffect(() => {
        const handleDocumentClick = ({ target }: MouseEvent): void => {
            const { current: overlayEl } = overlayElRef;

            if (!isOpen || (overlayEl && overlayEl.contains(target as Node))) {
                return;
            }

            setIsOpen(false);
        };

        document.addEventListener('click', handleDocumentClick);

        return (): void => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [isOpen]);

    return (
        <div className={classNames('bp-SettingsListbox', className)}>
            <div className="bp-SettingsListbox-container">
                <div className="bp-SettingsListbox-label" id={`${id}-label`}>
                    {label}
                </div>
                <button
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-labelledby={`${id}-label ${id}-button`}
                    className="bp-SettingsListbox-button"
                    id={`${id}-button`}
                    onClick={handleButtonClick}
                    type="button"
                >
                    {value}
                </button>
                <div ref={overlayElRef} className={classNames('bp-SettingsListbox-overlay', { 'bp-is-open': isOpen })}>
                    <ul
                        ref={listboxRef}
                        aria-labelledby={`${id}-label`}
                        className="bp-SettingsListbox-list"
                        onKeyDown={handleKeyDown}
                        role="listbox"
                        tabIndex={-1}
                    >
                        {listItems.map(({ label: itemLabel, value: itemValue }, listIndex) => {
                            const isActive = listIndex === activeIndex;
                            const isSelected = value === itemValue;

                            return (
                                <li
                                    key={itemValue}
                                    ref={isActive ? setActiveItem : noop}
                                    aria-selected={isSelected}
                                    className="bp-SettingsListbox-listitem"
                                    id={itemValue}
                                    onClick={(): void => handleSelect(itemValue)}
                                    onKeyDown={createKeyDownHandler(itemValue)}
                                    role="option"
                                    tabIndex={0}
                                >
                                    <div
                                        className={classNames('bp-SettingsListbox-listoption', {
                                            'bp-is-active': isActive,
                                        })}
                                    >
                                        {itemLabel}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
