import React from 'react';
import { render, screen, act } from '@testing-library/react';
import FilmstripV2 from '../FilmstripV2';

describe('FilmstripV2', () => {
    describe('visibility', () => {
        test('should have bp-is-shown class when isShown is true', () => {
            render(<FilmstripV2 isShown />);
            expect(screen.getByTestId('bp-FilmstripV2')).toHaveClass('bp-is-shown');
        });

        test('should not have bp-is-shown class when isShown is false', () => {
            render(<FilmstripV2 isShown={false} />);
            expect(screen.getByTestId('bp-FilmstripV2')).not.toHaveClass('bp-is-shown');
        });
    });

    describe('positioning', () => {
        test('should position based on position prop', () => {
            render(<FilmstripV2 position={200} positionMax={800} />);
            const el = screen.getByTestId('bp-FilmstripV2');
            expect(el.style.left).toBeDefined();
        });

        test('should clamp position to not overflow left edge', () => {
            render(<FilmstripV2 position={0} positionMax={800} />);
            const el = screen.getByTestId('bp-FilmstripV2');
            expect(el.style.left).toBe('0px');
        });
    });

    describe('frame display', () => {
        test('should set background image when imageUrl is provided', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" interval={1} time={5} />);
            const frameImage = screen.getByTestId('bp-FilmstripV2-frameImage');
            expect(frameImage.style.backgroundImage).toContain('https://example.com/filmstrip.jpg');
        });

        test('should not render the filmstrip image when imageUrl is empty', () => {
            render(<FilmstripV2 interval={1} time={5} />);
            expect(screen.queryByTestId('bp-FilmstripV2-frameImage')).not.toBeInTheDocument();
        });

        test('should set frame height to 135px', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" interval={1} time={5} />);
            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            expect(frame.style.height).toBe('135px');
        });

        test('should calculate background position based on time and interval', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" interval={1} time={10} />);
            const frameImage = screen.getByTestId('bp-FilmstripV2-frameImage');
            expect(frameImage.style.backgroundPositionX).toBeDefined();
        });
    });

    describe('time display', () => {
        test('should display standard time when fps is not provided', () => {
            render(<FilmstripV2 time={65} />);
            const timeEl = screen.getByTestId('bp-FilmstripV2-time');
            expect(timeEl).toHaveTextContent('1:05');
        });

        test('should display 0:00 for time 0 when fps is not provided', () => {
            render(<FilmstripV2 time={0} />);
            const timeEl = screen.getByTestId('bp-FilmstripV2-time');
            expect(timeEl).toHaveTextContent('0:00');
        });

        test('should display timecode when fps is provided', () => {
            render(<FilmstripV2 fps={30} time={61.5} />);
            const timeEl = screen.getByTestId('bp-FilmstripV2-time');
            expect(timeEl).toHaveTextContent('00:01:01:15');
        });
    });

    describe('loading state', () => {
        test('should show crawler when image has not loaded', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" />);
            expect(screen.getByTestId('bp-FilmstripV2-crawler')).toBeInTheDocument();
        });

        test('should hide crawler after image loads', () => {
            let capturedImg: HTMLImageElement | null = null;
            const originalCreateElement = document.createElement.bind(document);
            jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                const el = originalCreateElement(tag);
                if (tag === 'img') capturedImg = el as HTMLImageElement;
                return el;
            });

            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" />);
            expect(screen.getByTestId('bp-FilmstripV2-crawler')).toBeInTheDocument();

            act(() => {
                if (capturedImg?.onload) {
                    Object.defineProperty(capturedImg, 'naturalWidth', { value: 24000 });
                    (capturedImg.onload as (this: GlobalEventHandlers, ev: Event) => void).call(
                        capturedImg,
                        new Event('load'),
                    );
                }
            });

            expect(screen.queryByTestId('bp-FilmstripV2-crawler')).not.toBeInTheDocument();

            (document.createElement as jest.Mock).mockRestore();
        });
    });

    describe('frame width', () => {
        const mockFilmstripLoad = (naturalWidth: number): (() => void) => {
            let capturedImg: HTMLImageElement | null = null;
            const originalCreateElement = document.createElement.bind(document);
            jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                const el = originalCreateElement(tag);
                if (tag === 'img') capturedImg = el as HTMLImageElement;
                return el;
            });

            return (): void => {
                act(() => {
                    if (capturedImg?.onload) {
                        Object.defineProperty(capturedImg, 'naturalWidth', { value: naturalWidth });
                        (capturedImg.onload as (this: GlobalEventHandlers, ev: Event) => void).call(
                            capturedImg,
                            new Event('load'),
                        );
                    }
                });
                (document.createElement as jest.Mock).mockRestore();
            };
        };

        test('should derive display width from filmstrip image width after load', () => {
            const triggerLoad = mockFilmstripLoad(12800);
            render(
                <FilmstripV2 aspectRatio={1.4167} imageUrl="https://example.com/filmstrip.jpg" interval={1} time={1} />,
            );
            const frame = screen.getByTestId('bp-FilmstripV2-frame');

            // Before load: source = floor(1.4167 * 90) = 127, display = floor(127 * 1.5) = 190
            expect(frame).toHaveStyle({ width: '190px' });

            triggerLoad();

            // After load: source = floor(12800 / 100) = 128, display = floor(128 * 1.5) = 192
            expect(frame).toHaveStyle({ width: '192px' });
        });

        test('should pan in native JPEG pixels so scaled frames do not drift', () => {
            const triggerLoad = mockFilmstripLoad(12700);
            render(
                <FilmstripV2
                    aspectRatio={1.4167}
                    imageUrl="https://example.com/filmstrip.jpg"
                    interval={1}
                    time={53}
                />,
            );

            triggerLoad();

            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            const frameImage = screen.getByTestId('bp-FilmstripV2-frameImage');
            expect(frame).toHaveStyle({ width: '190px' });
            expect(frameImage).toHaveStyle({ width: '127px', height: '90px' });
            expect(frameImage.style.backgroundPositionX).toBe('-6731px');
            expect(Number.parseInt(frameImage.style.backgroundPositionY, 10)).toBe(0);
        });

        test('should keep even source frames aligned after 1.5x scale', () => {
            const triggerLoad = mockFilmstripLoad(12800);
            render(
                <FilmstripV2
                    aspectRatio={1.4167}
                    imageUrl="https://example.com/filmstrip.jpg"
                    interval={1}
                    time={53}
                />,
            );

            triggerLoad();

            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            const frameImage = screen.getByTestId('bp-FilmstripV2-frameImage');
            expect(frame).toHaveStyle({ width: '192px' });
            expect(frameImage).toHaveStyle({ width: '128px', height: '90px', transform: 'scale(1.5)' });
            expect(frameImage.style.backgroundPositionX).toBe('-6784px');
            expect(Number.parseInt(frameImage.style.backgroundPositionY, 10)).toBe(0);
        });

        test('should pan to the next native row after 100 frames', () => {
            const triggerLoad = mockFilmstripLoad(12800);
            render(
                <FilmstripV2
                    aspectRatio={1.4167}
                    imageUrl="https://example.com/filmstrip.jpg"
                    interval={1}
                    time={110}
                />,
            );

            triggerLoad();

            const frameImage = screen.getByTestId('bp-FilmstripV2-frameImage');
            expect(frameImage.style.backgroundPositionX).toBe('-1280px');
            expect(frameImage.style.backgroundPositionY).toBe('-90px');
        });
    });
});
