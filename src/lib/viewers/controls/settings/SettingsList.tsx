import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { decodeKeydown } from '../../../util';

export type Props = React.PropsWithChildren<{
    className?: string;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    tag?: string;
}>;

function SettingsList<T extends HTMLElement, LT extends HTMLElement>(props: Props, ref: React.Ref<T>): JSX.Element {
    const { children, className, onKeyDown = noop, tag: Tag = 'div', ...rest } = props;
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [activeItem, setActiveItem] = React.useState<LT | null>(null);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const max = React.Children.toArray(children).length - 1;

        if (key === 'ArrowUp' && activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }

        if (key === 'ArrowDown' && activeIndex < max) {
            setActiveIndex(activeIndex + 1);
        }

        onKeyDown(event);
    };

    React.useEffect(() => {
        if (activeItem) {
            activeItem.focus();
        }
    }, [activeItem]);

    return (
        <Tag ref={ref} className={classNames('bp-SettingsList', className)} onKeyDown={handleKeyDown} {...rest}>
            {React.Children.map(children, (listItem, itemIndex) => {
                if (React.isValidElement(listItem) && itemIndex === activeIndex) {
                    return React.cloneElement(listItem, { ref: setActiveItem, ...listItem.props });
                }

                return listItem;
            })}
        </Tag>
    );
}

export default React.forwardRef(SettingsList);
