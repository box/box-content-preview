import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsOverflowMenuV2 from '../../controls-bar/ControlsOverflowMenuV2';
import getRotateItem from '../getRotateItem';
import RotateControlV2 from '../RotateControlV2';

class ResizeObserverMock {
    disconnect = jest.fn();

    observe = jest.fn();

    unobserve = jest.fn();
}

describe('getRotateItem', () => {
    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    });

    test('should render the rotate button on the bar', () => {
        const onRotateLeft = jest.fn();
        const item = getRotateItem({ menuLabel: 'Rotate image', onRotateLeft }, 1);

        expect(item).toMatchObject({
            control: <RotateControlV2 onRotateLeft={onRotateLeft} />,
            id: 'rotate',
            priority: 1,
        });
    });

    test('should render a menu row with the given label and the R shortcut that rotates left', async () => {
        const user = userEvent.setup();
        const onRotateLeft = jest.fn();

        render(
            <Toolbar.Root aria-label="Controls">
                <ControlsOverflowMenuV2 items={[getRotateItem({ menuLabel: 'Rotate image', onRotateLeft }, 1)]} />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

        await user.click(screen.getByRole('button', { name: __('controls_more') }));

        const row = screen.getByRole('menuitem', { name: 'Rotate image' });

        expect(row).toHaveAttribute('aria-keyshortcuts', 'R');
        expect(row).toHaveAttribute('data-resin-target', 'rotate');

        await user.click(row);

        expect(onRotateLeft).toHaveBeenCalledWith();
    });
});
