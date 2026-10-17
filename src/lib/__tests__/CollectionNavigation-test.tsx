import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionNavigationRoot, CollectionNavigationState } from '../CollectionNavigation';

describe('CollectionNavigationRoot', () => {
    let containerEl: HTMLElement;
    let collectionNavigation: CollectionNavigationRoot;
    let onNext: jest.Mock;
    let onPrevious: jest.Mock;

    const render = (state: CollectionNavigationState): void => {
        act(() => collectionNavigation.render(state));
    };

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        onNext = jest.fn();
        onPrevious = jest.fn();
        collectionNavigation = new CollectionNavigationRoot({ containerEl, onNext, onPrevious });
    });

    afterEach(() => {
        act(() => collectionNavigation.destroy());
        containerEl.remove();
    });

    test('should mount its host inside the container', () => {
        expect(containerEl).toContainElement(collectionNavigation.hostEl);
    });

    test.each`
        hasPrevious | hasNext
        ${false}    | ${false}
        ${true}     | ${false}
        ${false}    | ${true}
        ${true}     | ${true}
    `('should render arrows for hasPrevious $hasPrevious and hasNext $hasNext', ({ hasNext, hasPrevious }) => {
        render({ hasNext, hasPrevious });

        expect(!!screen.queryByRole('button', { name: __('previous_file') })).toBe(hasPrevious);
        expect(!!screen.queryByRole('button', { name: __('next_file') })).toBe(hasNext);
    });

    test('should call the navigation handlers when the arrows are clicked', async () => {
        render({ hasNext: true, hasPrevious: true });

        await userEvent.click(screen.getByRole('button', { name: __('previous_file') }));
        expect(onPrevious).toBeCalledTimes(1);
        expect(onNext).not.toBeCalled();

        await userEvent.click(screen.getByRole('button', { name: __('next_file') }));
        expect(onNext).toBeCalledTimes(1);
    });

    test('should show the arrow label in a tooltip on hover', async () => {
        render({ hasNext: true, hasPrevious: false });

        await userEvent.hover(screen.getByRole('button', { name: __('next_file') }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(__('next_file'));
    });

    test('should tag the arrows for analytics', () => {
        render({ hasNext: true, hasPrevious: true });

        expect(screen.getByRole('button', { name: __('previous_file') })).toHaveAttribute(
            'data-target-id',
            'CollectionNavigation-previous',
        );
        expect(screen.getByRole('button', { name: __('next_file') })).toHaveAttribute(
            'data-target-id',
            'CollectionNavigation-next',
        );
    });

    test('should mark the arrows with the class that hosts hide', () => {
        render({ hasNext: true, hasPrevious: true });

        expect(screen.getByRole('button', { name: __('previous_file') }).closest('.bp-navigate')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: __('next_file') }).closest('.bp-navigate')).toBeInTheDocument();
    });

    test('should remove its host when destroyed', () => {
        render({ hasNext: true, hasPrevious: true });

        act(() => collectionNavigation.destroy());

        expect(containerEl).not.toContainElement(collectionNavigation.hostEl);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('should ignore renders after destroy', () => {
        act(() => collectionNavigation.destroy());
        jest.spyOn(collectionNavigation.root, 'render');

        render({ hasNext: true, hasPrevious: true });

        expect(collectionNavigation.root.render).not.toBeCalled();
    });
});
