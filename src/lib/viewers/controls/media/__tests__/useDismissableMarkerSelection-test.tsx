import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import useDismissableMarkerSelection from '../useDismissableMarkerSelection';

function Probe({
    hostSelectedId = null,
    omitSelectedAttr = false,
}: {
    hostSelectedId?: string | null;
    omitSelectedAttr?: boolean;
}): JSX.Element {
    const { containerRef, selectMarker, selectedId } = useDismissableMarkerSelection(hostSelectedId);

    return (
        <div ref={containerRef}>
            <button
                data-bp-marker-selected={!omitSelectedAttr && selectedId === 'a' ? '' : undefined}
                onClick={() => selectMarker('a')}
                type="button"
            >
                a
            </button>
            <span data-testid="selected">{selectedId ?? 'none'}</span>
        </div>
    );
}

function GroupProbe({ hostSelectedId = 'a' }: { hostSelectedId?: string | null }): JSX.Element {
    const { containerRef, selectedId } = useDismissableMarkerSelection(hostSelectedId);

    return (
        <div ref={containerRef}>
            <div data-bp-marker-group="">
                <span data-bp-marker-selected="">badge</span>
                <button data-testid="group-chrome" type="button">
                    chrome
                </button>
            </div>
            <span data-testid="selected">{selectedId ?? 'none'}</span>
        </div>
    );
}

describe('useDismissableMarkerSelection', () => {
    test('should select on click and dismiss on pointerdown outside', async () => {
        const user = userEvent.setup();
        render(<Probe />);

        await user.click(screen.getByRole('button', { name: 'a' }));
        expect(screen.getByTestId('selected')).toHaveTextContent('a');

        await user.click(document.body);
        expect(screen.getByTestId('selected')).toHaveTextContent('none');
    });

    test('should keep the dismissed id off when the host acks that same comment', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Probe />);

        await user.click(screen.getByRole('button', { name: 'a' }));
        await user.click(document.body);
        rerender(<Probe hostSelectedId="a" />);

        expect(screen.getByTestId('selected')).toHaveTextContent('none');
    });

    test('should restore selection when the host selects a different comment', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Probe hostSelectedId="a" />);

        await user.click(document.body);
        rerender(<Probe hostSelectedId="b" />);

        expect(screen.getByTestId('selected')).toHaveTextContent('b');
    });

    test('should not dismiss when the selected node is missing from the DOM', async () => {
        const user = userEvent.setup();
        render(<Probe hostSelectedId="a" omitSelectedAttr />);

        await user.click(document.body);

        expect(screen.getByTestId('selected')).toHaveTextContent('a');
    });

    test('should not dismiss when pointerdown is on cluster chrome around the selected badge', async () => {
        const user = userEvent.setup();
        render(<GroupProbe />);

        await user.click(screen.getByTestId('group-chrome'));

        expect(screen.getByTestId('selected')).toHaveTextContent('a');
    });
});
