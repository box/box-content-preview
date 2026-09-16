import React from 'react';
import classNames from 'classnames';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import ColorPickerPalette from './ColorPickerPalette';
import IconChevronDownMedium24 from '../icons/IconChevronDownMedium24';
import IconChevronUpMedium24 from '../icons/IconChevronUpMedium24';
import useClickOutside from '../hooks/useClickOutside';
import { ControlsLayerContext } from '../controls-layer';
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
}: Props): React.JSX.Element | null {
    const controlRef = React.useRef<HTMLDivElement>(null);
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [isColorPickerToggled, setIsColorPickerToggled] = React.useState(false);

    const handleSelect = (color: string): void => {
        setIsColorPickerToggled(false);
        onColorSelect(color);
    };

    const handleClick = (): void => setIsColorPickerToggled(!isColorPickerToggled);

    useClickOutside(controlRef, () => setIsColorPickerToggled(false));

    React.useEffect(() => {
        if (!isColorPickerToggled) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setIsColorPickerToggled(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return (): void => document.removeEventListener('keydown', handleKeyDown);
    }, [isColorPickerToggled]);

    // Pin the auto-hiding ControlsLayer open while the palette is up so its ~2s hide timer can't tear the
    // palette down when the cursor merely drifts off the swatches; release the pin on close or unmount.
    React.useEffect(() => {
        setIsForced(isColorPickerToggled);
        return (): void => setIsForced(false);
    }, [isColorPickerToggled, setIsForced]);

    return (
        <div ref={controlRef} className="bp-ColorPickerControl" data-testid="bp-color-picker-control">
            <button
                className={classNames('bp-ColorPickerControl-toggle', { 'bp-is-active': isColorPickerToggled })}
                data-resin-target="colorPickerOpen"
                data-testid="bp-ColorPickerControl-toggle"
                onClick={handleClick}
                type="button"
                {...rest}
            >
                <div className="bp-ColorPickerControl-toggle-background">
                    <div className="bp-ColorPickerControl-toggle-swatch" style={{ backgroundColor: activeColor }} />
                </div>
                {isColorPickerToggled ? <IconChevronUpMedium24 /> : <IconChevronDownMedium24 />}
            </button>
            <div
                className={classNames('bp-ColorPickerControl-palette', { 'bp-is-open': isColorPickerToggled })}
                data-testid="bp-ColorPickerControl-palette"
            >
                <ColorPickerPalette colors={colors} data-testid="bp-ColorPickerPalette" onSelect={handleSelect} />
            </div>
        </div>
    );
}
