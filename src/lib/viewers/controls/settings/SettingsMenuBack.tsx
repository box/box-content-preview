import React from 'react';
import IconArrowLeft24 from '../icons/IconArrowLeft24';
import SettingsContext, { Menu } from './SettingsContext';
import { decodeKeydown } from '../../../util';
import './SettingsMenuBack.scss';

export type Props = {
    label: string;
};
export type Ref = HTMLDivElement;

function SettingsMenuBack({ label }: Props, ref: React.Ref<Ref>): JSX.Element {
    const { setActiveMenu } = React.useContext(SettingsContext);

    const handleClick = (): void => {
        setActiveMenu(Menu.MAIN);
    };

    const handleKeydown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const key = decodeKeydown(event);

        if (key !== 'ArrowLeft' && key !== 'Enter' && key !== 'Space') {
            return;
        }

        setActiveMenu(Menu.MAIN);
    };

    return (
        <div
            ref={ref}
            className="bp-SettingsMenuBack"
            onClick={handleClick}
            onKeyDown={handleKeydown}
            role="menuitem"
            tabIndex={0}
        >
            <div className="bp-SettingsMenuBack-arrow">
                <IconArrowLeft24 height={18} width={18} />
            </div>
            <div aria-label={label} className="bp-SettingsMenuBack-label">
                {label}
            </div>
        </div>
    );
}

export default React.forwardRef(SettingsMenuBack);
