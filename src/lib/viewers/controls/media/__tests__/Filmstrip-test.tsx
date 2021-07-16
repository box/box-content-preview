import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import Filmstrip from '../Filmstrip';

describe('Filmstrip', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<Filmstrip aspectRatio={2} imageUrl="https://app.box.com" {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();
            expect(wrapper.hasClass('bp-Filmstrip')).toBe(true);
        });

        test.each`
            time   | left      | top
            ${0}   | ${-0}     | ${-0}
            ${1}   | ${-180}   | ${-0}
            ${10}  | ${-1800}  | ${-0}
            ${30}  | ${-5400}  | ${-0}
            ${60}  | ${-10800} | ${-0}
            ${100} | ${-0}     | ${-90}
            ${110} | ${-1800}  | ${-90}
            ${500} | ${-0}     | ${-450}
            ${510} | ${-1800}  | ${-450}
        `('should display the frame position for time $time as $left/$top', ({ left, time, top }) => {
            const wrapper = getWrapper({ time });
            expect(wrapper.find('[data-testid="bp-Filmstrip-frame"]').prop('style')).toMatchObject({
                backgroundImage: "url('https://app.box.com')",
                backgroundPositionX: left,
                backgroundPositionY: top,
            });
        });

        test.each`
            aspectRatio  | width
            ${undefined} | ${160}
            ${0}         | ${160}
            ${1}         | ${90}
            ${2}         | ${180}
        `('should display the frame size for aspect ratio $aspectRatio as $width', ({ aspectRatio, width }) => {
            const wrapper = getWrapper({ aspectRatio });
            expect(wrapper.find('[data-testid="bp-Filmstrip-frame"]').prop('style')).toMatchObject({
                height: 90,
                width,
            });
        });

        test('should display the correct filmstrip time', () => {
            const wrapper = getWrapper({ time: 120 });
            expect(wrapper.find('[data-testid="bp-Filmstrip-time"]').text()).toBe('2:00');
        });

        test('should display the crawler while the filmstrip image loads', done => {
            const mockImage = document.createElement('img');

            Object.defineProperty(mockImage, 'src', {
                set() {
                    setTimeout(() => {
                        this.onload();
                        done();
                    });
                },
            });

            jest.useFakeTimers();
            jest.spyOn(document, 'createElement').mockImplementation(() => mockImage);
            jest.spyOn(React, 'useEffect').mockImplementationOnce(func => func());

            const wrapper = getWrapper();
            expect(wrapper.exists('[data-testid="bp-Filmstrip-crawler"]')).toBe(true);

            jest.advanceTimersByTime(0); // Simulate loading complete
            expect(wrapper.exists('[data-testid="bp-Filmstrip-crawler"]')).toBe(false);
        });
    });
});
