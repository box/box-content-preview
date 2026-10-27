import React from 'react';
import './ControlsPillV2.scss';

export type Props = {
    children: React.ReactNode;
};

// Groups the parts of one control, like page or zoom, on a shared background. Buttons inside take the
// bp-ControlsPillV2-button class, and a text button takes bp-ControlsPillV2-label.
export default function ControlsPillV2({ children }: Props): JSX.Element {
    return (
        <div className="bp-ControlsPillV2" data-testid="bp-ControlsPill">
            {children}
        </div>
    );
}
