import React from 'react';
import classNames from 'classnames';
import IconArrowRight24 from '../icons/IconArrowRight24';
import SettingsContext, { Menu } from './SettingsContext';
import { decodeKeydown } from '../../../util';
import './SettingsMenuItem.scss';

export type Props = {
    className?: string;
    label: string;
    target: Menu;
    value: string;
};
export type Ref = HTMLDivElement;

function SettingsMenuItem(props: Props, ref: React.Ref<Ref>): JSX.Element {
    const { className, label, target, value } = props;
    const { setActiveMenu } = React.useContext(SettingsContext);

    const handleClick = (): void => {
        setActiveMenu(target);
    };

    const handleKeydown = (event: React.KeyboardEvent<Ref>): void => {
        const key = decodeKeydown(event);

        if (key !== 'ArrowRight' && key !== 'Enter' && key !== 'Space') {
            return;
        }

        setActiveMenu(target);
    };

    return (
        <div
            ref={ref}
            aria-haspopup="true"
            className={classNames('bp-SettingsMenuItem', className)}
            onClick={handleClick}
            onKeyDown={handleKeydown}
            role="menuitem"
            tabIndex={0}
        >
            <div aria-label={label} className="bp-SettingsMenuItem-label">
                {label}
            </div>
            <div className="bp-SettingsMenuItem-value">{value}</div>
            <div className="bp-SettingsMenuItem-arrow">
                <IconArrowRight24 height={18} width={18} />
            </div>
        </div>
    );
}

export default React.forwardRef(SettingsMenuItem);
