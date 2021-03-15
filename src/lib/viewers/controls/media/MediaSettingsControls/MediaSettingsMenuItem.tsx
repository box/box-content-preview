import React from 'react';
import classNames from 'classnames';
import IconArrowRight24 from '../../icons/IconArrowRight24';
import MediaSettingsContext, { Menu } from './MediaSettingsContext';
import { decodeKeydown } from '../../../../util';
import './MediaSettingsMenuItem.scss';

export type Props = {
    className?: string;
    label: string;
    target: Menu;
    value: string;
};
export type Ref = HTMLDivElement;

function MediaSettingsMenuItem(props: Props, ref: React.Ref<Ref>): JSX.Element {
    const { className, label, target, value } = props;
    const { setActiveMenu } = React.useContext(MediaSettingsContext);

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
            className={classNames('bp-MediaSettingsMenuItem', className)}
            onClick={handleClick}
            onKeyDown={handleKeydown}
            role="menuitem"
            tabIndex={0}
        >
            <div aria-label={label} className="bp-MediaSettingsMenuItem-label">
                {label}
            </div>
            <div className="bp-MediaSettingsMenuItem-value">{value}</div>
            <div className="bp-MediaSettingsMenuItem-arrow">
                <IconArrowRight24 height={18} width={18} />
            </div>
        </div>
    );
}

export default React.forwardRef(MediaSettingsMenuItem);
