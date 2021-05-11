import React from 'react';
import classNames from 'classnames';
import uniqueId from 'lodash/uniqueId';
import SettingsFlyout from './SettingsFlyout';
import SettingsList from './SettingsList';
import useClickOutside from '../hooks/useClickOutside';
import { decodeKeydown } from '../../../util';
import './SettingsDropdown.scss';

export type ListItem = {
    label: string;
    value: string;
};

export type Props = {
    className?: string;
    label: string;
    listItems: Array<ListItem>;
    onSelect: () => void;
    value?: string;
};

export default function SettingsDropdown({ className, label, listItems, onSelect, value }: Props): JSX.Element {
    const { current: id } = React.useRef(uniqueId('bp-SettingsDropdown_'));
    const buttonElRef = React.useRef<HTMLButtonElement | null>(null);
    const dropdownElRef = React.useRef<HTMLDivElement | null>(null);
    const listElRef = React.useRef<HTMLUListElement | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleButtonClick = (): void => setIsOpen(!isOpen);
    const handleClickOutside = (): void => setIsOpen(false);
    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Escape') {
            setIsOpen(false);

            if (buttonElRef.current) {
                buttonElRef.current.focus(); // Prevent focus from falling back to the body on flyout close
            }
        }

        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const handleSelect = (selectedOption: string): void => {
        setIsOpen(false);
        onSelect(selectedOption);
    };
    const createClickHandler = (selectedOption: string) => (event: React.KeyboardEvent): void => {
        handleSelect(selectedOption);

        event.preventDefault();
        event.stopPropagation();
    };
    const createKeyDownHandler = (selectedOption: string) => (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key !== 'Space' && key !== 'Enter') {
            return;
        }

        handleSelect(selectedOption);
    };

    React.useEffect(() => {
        const { current: listEl } = listElRef;
        if (isOpen && listEl) {
            listEl.focus();
        }
    }, [isOpen]);

    useClickOutside(dropdownElRef.current, handleClickOutside);

    return (
        <div ref={dropdownElRef} className={classNames('bp-SettingsDropdown', className)}>
            <div className="bp-SettingsDropdown-label" id={`${id}-label`}>
                {label}
            </div>
            <button
                ref={buttonElRef}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-labelledby={`${id}-label ${id}-button`}
                className={classNames('bp-SettingsDropdown-button', { 'bp-is-open': isOpen })}
                id={`${id}-button`}
                onClick={handleButtonClick}
                type="button"
            >
                {value}
            </button>
            <SettingsFlyout className="bp-SettingsDropdown-flyout" isOpen={isOpen}>
                <SettingsList
                    ref={listElRef}
                    aria-labelledby={`${id}-label`}
                    className="bp-SettingsDropdown-list"
                    onKeyDown={handleKeyDown}
                    role="listbox"
                    tabIndex={-1}
                    tag="ul"
                >
                    {listItems.map(({ label: itemLabel, value: itemValue }) => {
                        return (
                            <li
                                key={itemValue}
                                aria-selected={value === itemValue}
                                className="bp-SettingsDropdown-listitem"
                                id={itemValue}
                                onClick={createClickHandler(itemValue)}
                                onKeyDown={createKeyDownHandler(itemValue)}
                                role="option"
                                tabIndex={0}
                            >
                                {itemLabel}
                            </li>
                        );
                    })}
                </SettingsList>
            </SettingsFlyout>
        </div>
    );
}
