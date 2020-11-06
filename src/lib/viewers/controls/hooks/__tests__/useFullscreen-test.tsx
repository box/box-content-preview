import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import fullscreen from '../../../../Fullscreen';
import useFullscreen from '../useFullscreen';

describe('useFullscreen', () => {
    function TestComponent(): JSX.Element {
        const isFullscreen = useFullscreen();

        return <div className={isFullscreen ? 'fullscreen' : ''} />;
    }

    const getElement = (wrapper: ReactWrapper): ReactWrapper => wrapper.childAt(0);
    const getWrapper = (): ReactWrapper => mount(<TestComponent />);

    test('should return the current fullscreen status', () => {
        const wrapper = getWrapper();

        expect(getElement(wrapper).hasClass('fullscreen')).toBe(false);

        act(() => {
            fullscreen.enter();
        });
        wrapper.update();

        expect(getElement(wrapper).hasClass('fullscreen')).toBe(true);

        act(() => {
            fullscreen.exit();
        });
        wrapper.update();

        expect(getElement(wrapper).hasClass('fullscreen')).toBe(false);
    });
});
