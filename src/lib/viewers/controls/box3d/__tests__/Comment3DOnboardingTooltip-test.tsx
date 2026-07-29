import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Comment3DOnboardingTooltip from '../Comment3DOnboardingTooltip';

// react-tether calls ReactDOM.findDOMNode + positions against layout, which jsdom
// can't provide; render its target/element inline so the tooltip content is testable.
jest.mock('react-tether', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

describe('Comment3DOnboardingTooltip', () => {
    const renderTooltip = (props = {}): void => {
        render(
            <Comment3DOnboardingTooltip {...props}>
                <button type="button">Comment</button>
            </Comment3DOnboardingTooltip>,
        );
    };

    test('should render the anchor child', () => {
        renderTooltip();

        expect(screen.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
    });

    test('should not show the coach-mark when disabled', () => {
        renderTooltip({ isEnabled: false });

        expect(screen.queryByText('Annotate your 3D model')).not.toBeInTheDocument();
    });

    test('should show the coach-mark when enabled', () => {
        renderTooltip({ isEnabled: true });

        expect(screen.getByText('Annotate your 3D model')).toBeInTheDocument();
    });

    test('should call onDismiss when the close button is clicked', async () => {
        const user = userEvent.setup();
        const onDismiss = jest.fn();
        renderTooltip({ isEnabled: true, onDismiss });

        await user.click(screen.getByLabelText('Close'));

        expect(onDismiss).toHaveBeenCalled();
        expect(screen.queryByText('Annotate your 3D model')).not.toBeInTheDocument();
    });
});
