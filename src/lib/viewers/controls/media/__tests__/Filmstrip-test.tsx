import React from 'react';
import { render, screen } from '@testing-library/react';
import Filmstrip from '../Filmstrip';

describe('Filmstrip', () => {
    const getComponent = (props = {}) => <Filmstrip aspectRatio={2} imageUrl="https://app.box.com" {...props} />;
    const getWrapper = (props = {}) => render(getComponent(props));
    const getContainer = async () => screen.findByTestId('bp-Filmstrip');
    const getFrame = async () => screen.findByTestId('bp-Filmstrip-frame');

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const container = await getContainer();

            expect(container).toBeInTheDocument();
        });

        test.each`
            time   | left          | top
            ${0}   | ${'0'}        | ${'0'}
            ${1}   | ${'-180px'}   | ${'0'}
            ${10}  | ${'-1800px'}  | ${'0'}
            ${30}  | ${'-5400px'}  | ${'0'}
            ${60}  | ${'-10800px'} | ${'0'}
            ${100} | ${'0'}        | ${'-90px'}
            ${110} | ${'-1800px'}  | ${'-90px'}
            ${500} | ${'0'}        | ${'-450px'}
            ${510} | ${'-1800px'}  | ${'-450px'}
        `('should display the frame position for time $time as $left/$top', async ({ left, time, top }) => {
            getWrapper({ time });
            const frame = await getFrame();

            expect(frame).toHaveStyle({
                backgroundImage: "url('https://app.box.com')",
                backgroundPositionX: left,
                backgroundPositionY: top,
            });
        });

        test.each`
            aspectRatio  | width
            ${undefined} | ${'160px'}
            ${0}         | ${'160px'}
            ${1}         | ${'90px'}
            ${2}         | ${'180px'}
        `('should display the frame size for aspect ratio $aspectRatio as $width', async ({ aspectRatio, width }) => {
            getWrapper({ aspectRatio });
            const frame = await getFrame();

            expect(frame).toHaveStyle({
                height: '90px',
                width,
            });
        });

        test('should display the correct filmstrip time', async () => {
            getWrapper({ time: 120 });

            expect(await screen.findByText('2:00')).toBeInTheDocument();
        });

        test('should derive frame width from filmstrip image width after load', done => {
            const mockImage = document.createElement('img');

            Object.defineProperty(mockImage, 'naturalWidth', { value: 12800 });
            Object.defineProperty(mockImage, 'src', {
                set() {
                    setTimeout(() => {
                        React.act(() => {
                            this.onload();
                        });
                        done();
                    });
                },
            });

            jest.useFakeTimers();

            const { rerender } = getWrapper({ aspectRatio: 1.4167, imageUrl: null, time: 1 });
            jest.spyOn(document, 'createElement').mockImplementation(() => mockImage);
            rerender(getComponent({ aspectRatio: 1.4167, imageUrl: 'https://app.box.com', time: 1 }));

            // Before image loads, frameWidth = Math.floor(1.4167 * 90) = 127
            const frame = screen.getByTestId('bp-Filmstrip-frame');
            expect(frame).toHaveStyle({ width: '127px' });

            jest.advanceTimersByTime(0); // Simulate loading complete

            // After image loads, frameWidth = Math.floor(12800 / 100) = 128
            expect(frame).toHaveStyle({ width: '128px' });
        });

        test('should display the crawler while the filmstrip image loads', done => {
            const mockImage = document.createElement('img');

            Object.defineProperty(mockImage, 'src', {
                set() {
                    setTimeout(() => {
                        React.act(() => {
                            this.onload();
                        });
                        done();
                    });
                },
            });

            jest.useFakeTimers();

            const { rerender } = getWrapper({ imageUrl: null });
            jest.spyOn(document, 'createElement').mockImplementation(() => mockImage);
            rerender(getComponent({ imageUrl: 'https://app.box.com' }));

            expect(screen.queryByTestId('bp-Filmstrip-crawler')).toBeInTheDocument();

            jest.advanceTimersByTime(0); // Simulate loading complete;
            expect(screen.queryByTestId('bp-Filmstrip-crawler')).toBeNull();
        });
    });
});
