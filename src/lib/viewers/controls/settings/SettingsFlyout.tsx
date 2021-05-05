import React from 'react';
import classNames from 'classnames';
import SettingsContext from './SettingsContext';
import './SettingsFlyout.scss';

export type Props = React.PropsWithChildren<{
    className?: string;
    isOpen: boolean;
}>;

export default function SettingsFlyout({ children, className, isOpen }: Props): JSX.Element {
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    const flyoutElRef = React.useRef<HTMLDivElement>(null);
    const { activeRect } = React.useContext(SettingsContext);
    const { height, width } = activeRect || { height: 'auto', width: 'auto' };

    React.useEffect(() => {
        const { current: flyoutEl } = flyoutElRef;
        const handleTransitionEnd = (): void => setIsTransitioning(false);
        const handleTransitionStart = (): void => setIsTransitioning(true);

        if (flyoutEl) {
            flyoutEl.addEventListener('transitionend', handleTransitionEnd);
            flyoutEl.addEventListener('transitionstart', handleTransitionStart);
        }

        return (): void => {
            if (flyoutEl) {
                flyoutEl.removeEventListener('transitionend', handleTransitionEnd);
                flyoutEl.removeEventListener('transitionstart', handleTransitionStart);
            }
        };
    }, []);

    return (
        <div
            ref={flyoutElRef}
            className={classNames('bp-SettingsFlyout', className, {
                'bp-is-open': isOpen,
                'bp-is-transitioning': isTransitioning,
            })}
            style={{ height, width }}
        >
            {isOpen && children}
        </div>
    );
}
