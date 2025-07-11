import * as React from 'react';
import { render, screen } from '@testing-library/react';
import fullscreen from '../../../../Fullscreen';
import useFullscreen from '../useFullscreen';

describe('useFullscreen', () => {
    function TestComponent(): React.JSX.Element {
        const isFullscreen = useFullscreen();

        return <div className={isFullscreen ? 'fullscreen' : ''} data-testid="test-div" />;
    }

    const getWrapper = () => render(<TestComponent />);
    const getElement = async () => screen.findByTestId('test-div');

    test('should return the current fullscreen status', async () => {
        getWrapper();
        const element = await getElement();

        expect(element).not.toHaveClass('fullscreen');

        React.act(() => {
            fullscreen.enter();
        });

        expect(element).toHaveClass('fullscreen');

        React.act(() => {
            fullscreen.exit();
        });

        expect(element).not.toHaveClass('fullscreen');
    });
});
