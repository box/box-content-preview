import React from 'react';
import classNames from 'classnames';
import uniqueId from 'lodash/uniqueId';
import SettingsFlyout from './SettingsFlyout';
import SettingsList from './SettingsList';
import useClickOutside from '../hooks/useClickOutside';
import { decodeKeydown } from '../../../util';
import './SettingsDropdown.scss';

export type Value = boolean | number | string;

export type ListItem<V extends Value = string> = {
    label: string;
    value: V;
};

export type Props<V extends Value = string> = {
    className?: string;
    label: string;
    listItems: Array<ListItem<V>>;
    onSelect: (value: V) => void;
    value?: V;
};

export type Ref = HTMLButtonElement | null;

function SettingsDropdown<V extends Value = string>(props: Props<V>, ref: React.Ref<Ref>): JSX.Element {
    const { className, label, listItems, onSelect, value } = props;
    const { current: id } = React.useRef(uniqueId('bp-SettingsDropdown_'));
    const buttonElRef = React.useRef<HTMLButtonElement | null>(null);
    const dropdownElRef = React.useRef<HTMLDivElement | null>(null);
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

    // Customize the forwarded ref to combine usage with the ref internal to this component
    React.useImperativeHandle(ref, () => buttonElRef.current, []);

    return (
        <div className={classNames('bp-SettingsDropdown', className)}>
            <div className="bp-SettingsDropdown-label" id={`${id}-label`}>
                {label}
            </div>
            <div ref={dropdownElRef} className="bp-SettingsDropdown-content">
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
                        aria-labelledby={`${id}-label`}
                        className="bp-SettingsDropdown-list"
                        isActive
                        onKeyDown={handleKeyDown}
                        role="listbox"
                        tabIndex={-1}
                    >
                        {listItems.map(({ label: itemLabel, value: itemValue }) => {
                            const itemValueString = itemValue.toString();
                            return (
                                <div
                                    key={itemValueString}
                                    aria-selected={value === itemValue}
                                    className="bp-SettingsDropdown-listitem"
                                    id={itemValueString}
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
        </div>
    );
}

export default React.forwardRef(SettingsDropdown);
