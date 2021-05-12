import React from 'react';
import classNames from 'classnames';
import uniqueId from 'lodash/uniqueId';
import SettingsFlyout from './SettingsFlyout';
import SettingsList from './SettingsList';
import useClickOutside from '../hooks/useClickOutside';
import { decodeKeydown } from '../../../util';
import './SettingsDropdown.scss';

export type ListItem<V> = {
    label: string;
    value: V;
};

export type Props<V> = {
    className?: string;
    label: string;
    listItems: Array<ListItem<V>>;
    onSelect: (value: V) => void;
    value?: V;
};

export default function SettingsDropdown<V extends string>({
    className,
    label,
    listItems,
    onSelect,
    value,
}: Props<V>): JSX.Element {
    const { current: id } = React.useRef(uniqueId('bp-SettingsDropdown_'));
    const buttonElRef = React.useRef<HTMLButtonElement | null>(null);
    const dropdownElRef = React.useRef<HTMLDivElement | null>(null);
    const listElRef = React.useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Escape') {
            setIsOpen(false);

            if (buttonElRef.current) {
                buttonElRef.current.focus(); // Prevent focus from falling back to the body on flyout close
            }
        }

        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape') {
            // Prevent the event from bubbling up and triggering any upstream keydown handling logic
            event.stopPropagation();
        }
    };
    const handleSelect = (selectedOption: V): void => {
        setIsOpen(false);
        onSelect(selectedOption);
    };
    const createClickHandler = (selectedOption: V) => (event: React.MouseEvent<HTMLDivElement>): void => {
        handleSelect(selectedOption);

        // Prevent the event from bubbling up and triggering any upstream click handling logic,
        // i.e. if the dropdown is nested inside a menu flyout
        event.stopPropagation();
    };
    const createKeyDownHandler = (selectedOption: V) => (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const key = decodeKeydown(event);

        if (key !== 'Space' && key !== 'Enter') {
            return;
        }

        handleSelect(selectedOption);
    };

    useClickOutside(dropdownElRef, () => setIsOpen(false));

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
                onClick={(): void => setIsOpen(!isOpen)}
                type="button"
            >
                {value}
            </button>
            <SettingsFlyout className="bp-SettingsDropdown-flyout" isOpen={isOpen}>
                <SettingsList
                    ref={listElRef}
                    aria-labelledby={`${id}-label`}
                    className="bp-SettingsDropdown-list"
                    isActive
                    onKeyDown={handleKeyDown}
                    role="listbox"
                    tabIndex={-1}
                >
                    {listItems.map(({ label: itemLabel, value: itemValue }) => {
                        return (
                            <div
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
                            </div>
                        );
                    })}
                </SettingsList>
            </SettingsFlyout>
        </div>
    );
}
