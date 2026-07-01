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
            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            expect(frame.style.backgroundImage).toContain('https://example.com/filmstrip.jpg');
        });

        test('should not set background image when imageUrl is empty', () => {
            render(<FilmstripV2 interval={1} time={5} />);
            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            expect(frame.style.backgroundImage).toBe('');
        });

        test('should set frame height to 135px', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" interval={1} time={5} />);
            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            expect(frame.style.height).toBe('135px');
        });

        test('should calculate background position based on time and interval', () => {
            render(<FilmstripV2 imageUrl="https://example.com/filmstrip.jpg" interval={1} time={10} />);
            const frame = screen.getByTestId('bp-FilmstripV2-frame');
            expect(frame.style.backgroundPositionX).toBeDefined();
        });
    });

    describe('timecode', () => {
        test('should display formatted time', () => {
            render(<FilmstripV2 time={65} />);
            const timeEl = screen.getByTestId('bp-FilmstripV2-time');
            expect(timeEl).toHaveTextContent('1:05');
        });

        test('should display 0:00 for time 0', () => {
            render(<FilmstripV2 time={0} />);
            const timeEl = screen.getByTestId('bp-FilmstripV2-time');
            expect(timeEl).toHaveTextContent('0:00');
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
});
