import React from 'react';
import classNames from 'classnames';
import './SettingsFlyout.scss';

export type Props = React.PropsWithChildren<{
    className?: string;
    height?: number | string;
    isOpen: boolean;
    width?: number | string;
}>;

export default function SettingsFlyout({
    children,
    className,
    height = 'auto',
    isOpen,
    width = 'auto',
}: Props): JSX.Element {
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    const flyoutElRef = React.useRef<HTMLDivElement>(null);

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
            data-testid="bp-settings-flyout"
            style={{ height, width }}
        >
            {isOpen && children}
        </div>
    );
}
