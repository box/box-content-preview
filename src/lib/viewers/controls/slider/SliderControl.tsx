import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import './SliderControl.scss';

export type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    className?: string;
    onChange?: (value: number) => void;
    track?: string;
};

export type Ref = HTMLInputElement;

function SliderControl({ className, onChange = noop, track, ...rest }: Props, ref: React.Ref<Ref>): JSX.Element {
    const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(parseFloat(target.value));
    };

    return (
        <div className={classNames('bp-SliderControl', className)}>
            <div
                className="bp-SliderControl-track"
                data-testid="bp-SliderControl-track"
                style={{ backgroundImage: track }}
            />
            <input
                ref={ref}
                className="bp-SliderControl-input"
                data-allow-keydown="true" // Enable global event handling within input field
                data-testid="bp-SliderControl-input"
                max={100}
                min={0}
                onChange={handleChange}
                step={1}
                type="range"
                {...rest}
            />
        </div>
    );
}

export default React.forwardRef(SliderControl);
