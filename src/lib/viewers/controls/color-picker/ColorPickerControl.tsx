import React from 'react';
import classNames from 'classnames';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import ColorPickerPalette from './ColorPickerPalette';
import './ColorPickerControl.scss';

export type Props = {
    activeColor?: string;
    colors: Array<string>;
    onColorSelect: (color: string) => void;
};

export default function ColorPickerControl({
    activeColor = bdlBoxBlue,
    colors,
    onColorSelect,
    ...rest
}: Props): JSX.Element | null {
    const paletteRef = React.useRef<HTMLDivElement>(null);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
    const [isColorPickerToggled, setIsColorPickerToggled] = React.useState(false);

    const handleSelect = (color: string): void => {
        setIsColorPickerToggled(false);
        onColorSelect(color);
    };

    const handleBlur = ({ relatedTarget }: React.FocusEvent<HTMLButtonElement>): void => {
        const { current: paletteEl } = paletteRef;
        const { current: toggleEl } = toggleRef;
        // IE11 does not have relatedTarget but update activeElement before blur
        const nextTarget = relatedTarget || document.activeElement;
        const nextEl = nextTarget ? (nextTarget as Node) : null;
        const isNextInPalette = paletteEl && paletteEl.contains(nextEl);
        const isNextToggle = toggleEl && toggleEl === nextEl;

        if (isNextInPalette || isNextToggle) {
            return;
        }

        setIsColorPickerToggled(false);
    };

    const handleClick = (): void => setIsColorPickerToggled(!isColorPickerToggled);

    const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (event.currentTarget.focus) {
            // Buttons do not receive focus in Firefox and Safari on MacOS
            event.currentTarget.focus();
            // When focus is called within a mousedown handler,
            // preventDefault must be called to keep the focus from leaving the target
            event.preventDefault();
        }
    };

    return (
        <div className="bp-ColorPickerControl">
            <button
                ref={toggleRef}
                className={classNames('bp-ColorPickerControl-toggle', { 'bp-is-active': isColorPickerToggled })}
                data-testid="bp-ColorPickerControl-toggle"
                onBlur={handleBlur}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                type="button"
                {...rest}
            >
                <div className="bp-ColorPickerControl-toggle-background">
                    <div className="bp-ColorPickerControl-toggle-swatch" style={{ backgroundColor: activeColor }} />
                </div>
            </button>
            <div
                ref={paletteRef}
                className={classNames('bp-ColorPickerControl-palette', { 'bp-is-open': isColorPickerToggled })}
                data-testid="bp-ColorPickerControl-palette"
            >
                <ColorPickerPalette
                    colors={colors}
                    data-testid="bp-ColorPickerPalette"
                    onBlur={handleBlur}
                    onSelect={handleSelect}
                />
            </div>
        </div>
    );
}
