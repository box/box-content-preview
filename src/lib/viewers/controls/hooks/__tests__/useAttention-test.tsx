import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import useAttention from '../useAttention';

describe('useAttention', () => {
    function TestComponent(): React.JSX.Element {
        const [isActive, handlers] = useAttention();
        return <div className={isActive ? 'active' : ''} data-testid="test-div" {...handlers} />;
    }

    const getWrapper = () => render(<TestComponent />);
    const getElement = async () => screen.findByTestId('test-div');

    test('should return isActive based on focus and/or hover state', async () => {
        getWrapper();
        const element = await getElement();

        expect(element).not.toHaveClass('active'); // Default

        fireEvent.focus(element);
        expect(element).toHaveClass('active'); // Focus

        fireEvent.mouseOver(element);
        expect(element).toHaveClass('active'); // Focus & Hover

        fireEvent.blur(element);
        expect(element).toHaveClass('active'); // Hover

        fireEvent.mouseOut(element);
        expect(element).not.toHaveClass('active'); // Default
    });

    test('should stay active when focus moves to a child', async () => {
        function NestedComponent(): React.JSX.Element {
            const [isActive, handlers] = useAttention();
            return (
                <div className={isActive ? 'active' : ''} data-testid="test-div" {...handlers}>
                    <button type="button">child</button>
                </div>
            );
        }
        render(<NestedComponent />);
        const element = await screen.findByTestId('test-div');
        const child = screen.getByRole('button', { name: 'child' });

        fireEvent.focus(element);
        fireEvent.blur(element, { relatedTarget: child });

        expect(element).toHaveClass('active');
    });
});
