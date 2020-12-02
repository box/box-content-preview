import React from 'react';
import noop from 'lodash/noop';

import ControlsBar from '../controls-bar';

import './ColorPickerPalette.scss';

export type Props = {
    onColorSelect: () => void;
};

export default function ColorPickerPalette({ onColorSelect = noop }: Props): JSX.Element {
    const colors = ['#0061d5', '#26c281', '#ed3757', '#f5b31b', '#ffd700', '#4826c2'];

    return (
        <ControlsBar>
            <div className="bp-ColorPickerPalette">
                {colors.map(color => {
                    return (
                        <button
                            key={color}
                            className="bp-ColorPickerPalette-button"
                            onClick={(): void => onColorSelect(color)}
                            style={{
                                'background-color': color,
                            }}
                            type="button"
                        />
                    );
                })}
            </div>
        </ControlsBar>
    );
}