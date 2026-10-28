import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import VideoControlsV2 from '../VideoControlsV2';
import fullscreen from '../../../Fullscreen';
import subtitles from '../../controls/media/__mocks__/subtitles';
import { AnnotationColor } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types/annotations';
import { Quality } from '../../controls/media/MediaSettingsMenuQuality';
import { SUBTITLES_OFF } from '../../../constants';

(global as unknown as { ResizeObserver: jest.Mock }).ResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
}));

const defaultProps = {
    audioTrack: 1,
    audioTracks: [],
    autoplay: false,
    isPlaying: false,
    movePlayback: jest.fn(),
    onAnnotationColorChange: jest.fn(),
    onAnnotationModeClick: jest.fn(),
    onAnnotationModeEscape: jest.fn(),
    onAudioTrackChange: jest.fn(),
    onAutoplayChange: jest.fn(),
    onFullscreenToggle: jest.fn(),
    onMuteChange: jest.fn(),
    onPlayPause: jest.fn(),
    onQualityChange: jest.fn(),
    onRateChange: jest.fn(),
    onTimeChange: jest.fn(),
    onVolumeChange: jest.fn(),
    quality: Quality.AUTO,
    rate: '1.0',
};

describe('VideoControlsV2', () => {
    describe('render', () => {
        test('should render the V2 controls wrapper', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByTestId('media-controls-wrapper-v2')).toBeInTheDocument();
        });

        test('should render play button and respond to clicks', async () => {
            const user = userEvent.setup();
            const onPlayPause = jest.fn();
            render(<VideoControlsV2 {...defaultProps} onPlayPause={onPlayPause} />);

            await user.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledWith(true);
        });

        test('should render pause button when playing', () => {
            render(<VideoControlsV2 {...defaultProps} isPlaying />);
            expect(screen.getByTitle('Pause')).toBeInTheDocument();
            expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
        });

        test('should render skip forward/backward buttons and respond to clicks', async () => {
            const user = userEvent.setup();
            const movePlayback = jest.fn();
            render(<VideoControlsV2 {...defaultProps} movePlayback={movePlayback} />);

            expect(screen.getByTitle('Skip forward')).toBeInTheDocument();
            expect(screen.getByTitle('Skip backward')).toBeInTheDocument();

            await user.click(screen.getByTitle('Skip forward'));
            expect(movePlayback).toHaveBeenCalledWith(true, 5);

            await user.click(screen.getByTitle('Skip backward'));
            expect(movePlayback).toHaveBeenCalledWith(false, 5);
        });

        test('should not render skip buttons when isNarrowVideo is true', () => {
            render(<VideoControlsV2 {...defaultProps} isNarrowVideo />);
            expect(screen.queryByTitle('Skip forward')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Skip backward')).not.toBeInTheDocument();
        });

        test('should render fullscreen button', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
        });

        test('should not render the VR toggle without a handler', () => {
            render(<VideoControlsV2 {...defaultProps} isBlueprintEnabled isVrShown />, { wrapper: BlueprintProviders });
            expect(screen.queryByRole('button', { name: 'Toggle VR display' })).not.toBeInTheDocument();
        });

        test('should not render the VR toggle when isBlueprintEnabled is false', () => {
            render(<VideoControlsV2 {...defaultProps} isVrShown onVrToggle={jest.fn()} />);
            expect(screen.queryByRole('button', { name: 'Toggle VR display' })).not.toBeInTheDocument();
        });

        test('should render a Blueprint VR toggle once it is shown and respond to clicks', async () => {
            const user = userEvent.setup();
            const onVrToggle = jest.fn();
            const { rerender } = render(
                <VideoControlsV2 {...defaultProps} isBlueprintEnabled onVrToggle={onVrToggle} />,
                { wrapper: BlueprintProviders },
            );
            expect(screen.queryByRole('button', { name: 'Toggle VR display' })).not.toBeInTheDocument();

            rerender(<VideoControlsV2 {...defaultProps} isBlueprintEnabled isVrShown onVrToggle={onVrToggle} />);

            const vrToggle = screen.getByRole('button', { name: 'Toggle VR display' });
            expect(vrToggle).toHaveAttribute('data-target-id', 'VrToggleControlV2-toggle');

            await user.click(vrToggle);
            expect(onVrToggle).toHaveBeenCalled();
        });

        test('should render Blueprint play and skip buttons when isBlueprintEnabled is true', async () => {
            const user = userEvent.setup();
            const onPlayPause = jest.fn();
            const movePlayback = jest.fn();
            render(
                <VideoControlsV2
                    {...defaultProps}
                    movePlayback={movePlayback}
                    onPlayPause={onPlayPause}
                    isBlueprintEnabled
                />,
                { wrapper: BlueprintProviders },
            );

            const play = screen.getByRole('button', { name: 'Play' });
            expect(play).toHaveAttribute('data-resin-target', 'playPause');
            await user.click(play);
            expect(onPlayPause).toHaveBeenCalledWith(true);

            await user.click(screen.getByRole('button', { name: 'Skip forward' }));
            expect(movePlayback).toHaveBeenCalledWith(true, 5);
            await user.click(screen.getByRole('button', { name: 'Skip backward' }));
            expect(movePlayback).toHaveBeenCalledWith(false, 5);
        });
    });

    describe('timestamp', () => {
        test('should show static standard time when canChangeTimeFormat is false', () => {
            render(<VideoControlsV2 {...defaultProps} currentTime={65} durationTime={120} />);
            const timestamp = screen.getByTestId('bp-TimestampControl-static');
            expect(timestamp).toHaveTextContent('1:05/2:00');
            expect(screen.queryByTestId('bp-TimestampControl-button')).not.toBeInTheDocument();
        });

        test('should show current / total time when not narrow', () => {
            render(<VideoControlsV2 {...defaultProps} canChangeTimeFormat currentTime={65} durationTime={120} />);
            const timestamp = screen.getByTestId('bp-TimestampControl-button');
            expect(timestamp).toHaveTextContent('1:05/2:00');
        });

        test('should show only current time when narrow', () => {
            render(
                <VideoControlsV2
                    {...defaultProps}
                    canChangeTimeFormat
                    currentTime={65}
                    durationTime={120}
                    isNarrowVideo
                />,
            );
            const timestamp = screen.getByTestId('bp-TimestampControl-button');
            expect(timestamp).toHaveTextContent('1:05');
            expect(timestamp).not.toHaveTextContent('/');
        });

        test('should open the time format dropdown when timestamp is clicked', async () => {
            const user = userEvent.setup();
            render(<VideoControlsV2 {...defaultProps} canChangeTimeFormat currentTime={65} durationTime={120} />);

            await user.click(screen.getByTestId('bp-TimestampControl-button'));
            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();
        });

        test('should render Blueprint timestamp chevron when isBlueprintEnabled is true', () => {
            render(<VideoControlsV2 {...defaultProps} canChangeTimeFormat isBlueprintEnabled />, {
                wrapper: BlueprintProviders,
            });

            expect(
                screen.getByTestId('bp-TimestampControl-button').querySelector('.bp-TimestampControl-chevron'),
            ).toBeInTheDocument();
            expect(screen.queryByTestId('IconChevronDownMedium24')).not.toBeInTheDocument();
        });
    });

    describe('volume controls', () => {
        test('should render volume and respond to mute click', async () => {
            const user = userEvent.setup();
            const onMuteChange = jest.fn();
            render(<VideoControlsV2 {...defaultProps} onMuteChange={onMuteChange} />);

            await user.click(screen.getByTitle('Mute'));
            expect(onMuteChange).toHaveBeenCalledTimes(1);
        });

        test('should render Blueprint volume mute when isBlueprintEnabled is true', async () => {
            const user = userEvent.setup();
            const onMuteChange = jest.fn();
            render(<VideoControlsV2 {...defaultProps} onMuteChange={onMuteChange} isBlueprintEnabled />, {
                wrapper: BlueprintProviders,
            });

            const mute = screen.getByRole('button', { name: 'Mute' });
            expect(mute).toHaveAttribute('data-resin-target', 'volumeToggle');
            await user.click(mute);
            expect(onMuteChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('subtitles toggle', () => {
        test('should render SubtitlesToggle when subtitles exist', () => {
            render(<VideoControlsV2 {...defaultProps} subtitle={SUBTITLES_OFF} subtitles={subtitles} />);
            expect(screen.getByTitle('Subtitles/Closed Captions')).toBeInTheDocument();
        });

        test('should render the Blueprint subtitles toggle when isBlueprintEnabled is true', () => {
            render(
                <VideoControlsV2 {...defaultProps} isBlueprintEnabled subtitle={SUBTITLES_OFF} subtitles={subtitles} />,
                { wrapper: BlueprintProviders },
            );

            const toggle = screen.getByRole('button', { name: __('media_subtitles_cc') });
            expect(toggle).toHaveClass('bp-SubtitlesToggleV2');
            expect(toggle).toHaveAttribute('aria-pressed', 'false');
        });
    });

    describe('settings', () => {
        test('should render settings button', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByTitle('Settings')).toBeInTheDocument();
        });

        test('should render the Blueprint settings menu with video options when isBlueprintEnabled is true', async () => {
            const user = userEvent.setup();
            render(
                <VideoControlsV2
                    {...defaultProps}
                    isHDSupported
                    isBlueprintEnabled
                    onSubtitleChange={jest.fn()}
                    subtitle={SUBTITLES_OFF}
                    subtitles={subtitles}
                />,
                { wrapper: BlueprintProviders },
            );

            expect(screen.queryByTestId('bp-settings')).not.toBeInTheDocument();
            await user.click(screen.getByRole('button', { name: __('media_settings') }));

            const menu = screen.getByRole('menu');
            expect(menu).toContainElement(screen.getByRole('menuitemcheckbox', { name: __('media_autoplay') }));
            expect(menu).toContainElement(screen.getByTestId('bp-media-settings-speed'));
            expect(menu).toContainElement(screen.getByTestId('bp-media-settings-quality'));
            expect(menu).toContainElement(screen.getByTestId('bp-media-settings-subtitles'));
        });
    });

    describe('annotations', () => {
        test('should not render annotations controls when disabled', () => {
            render(<VideoControlsV2 {...defaultProps} videoAnnotationsEnabled={false} />);
            expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
        });

        test('should render annotations controls when enabled', () => {
            render(<VideoControlsV2 {...defaultProps} hasDrawing hasRegion videoAnnotationsEnabled />);
            expect(screen.getByTestId('bp-annotations-controls')).toBeInTheDocument();
        });

        describe('with Blueprint', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            const renderBlueprint = (props: Partial<React.ComponentProps<typeof VideoControlsV2>> = {}) =>
                render(
                    <VideoControlsV2
                        {...defaultProps}
                        hasDrawing
                        hasRegion
                        isBlueprintEnabled
                        videoAnnotationsEnabled
                        {...props}
                    />,
                    { wrapper: BlueprintProviders },
                );

            test('should render the markup toggle in the bar and keep the palette closed', async () => {
                const user = userEvent.setup();
                const onAnnotationModeClick = jest.fn();
                renderBlueprint({ onAnnotationModeClick });

                expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
                expect(screen.queryByTestId('bp-AnnotationsControls-regionBtn')).not.toBeInTheDocument();
                await user.click(screen.getByTestId('bp-AnnotationsControls-toggleBtn'));
                expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
            });

            test('should style the markup toggle for the dark bar', () => {
                renderBlueprint();
                expect(screen.getByTestId('bp-AnnotationsControls-toggleBtn')).toHaveClass(
                    'bp-VideoControlsV2-annotationsToggle',
                );
            });

            test('should not render the toggle when no mode is available', () => {
                renderBlueprint({ hasDrawing: false, hasRegion: false });
                expect(screen.queryByTestId('bp-AnnotationsControls-toggleBtn')).not.toBeInTheDocument();
            });

            test('should open the palette with region and drawing modes while a mode is active', async () => {
                const user = userEvent.setup();
                const onAnnotationModeClick = jest.fn();
                renderBlueprint({ annotationMode: AnnotationMode.REGION, onAnnotationModeClick });

                const palette = screen.getByTestId('bp-AnnotationsPaletteV2');
                expect(palette).toContainElement(screen.getByTestId('bp-AnnotationsControls-regionBtn'));
                expect(palette).toContainElement(screen.getByTestId('bp-AnnotationsControls-drawBtn'));
                expect(screen.queryByTestId('bp-AnnotationsControls-highlightBtn')).not.toBeInTheDocument();
                expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();

                await user.click(screen.getByTestId('bp-AnnotationsControls-drawBtn'));
                expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.DRAWING });
            });

            test('should open the palette outside the controls, anchored to the markup toggle', () => {
                jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(
                    this: HTMLElement,
                ) {
                    return this.dataset.testid === 'bp-AnnotationsControls-toggleBtn'
                        ? ({ right: 640, top: 500 } as DOMRect)
                        : ({ left: 0, top: 0 } as DOMRect);
                });
                renderBlueprint({ annotationMode: AnnotationMode.REGION });

                const anchor = screen.getByTestId('bp-AnnotationsPaletteAnchorV2');
                expect(anchor).toContainElement(screen.getByTestId('bp-AnnotationsPaletteV2'));
                expect(screen.getByTestId('media-controls-wrapper-v2')).not.toContainElement(anchor);
                expect(anchor).toHaveStyle({ left: '640px', top: '500px' });
            });

            test.each`
                annotationMode            | side
                ${AnnotationMode.NONE}    | ${'top'}
                ${AnnotationMode.DRAWING} | ${'left'}
            `(
                'should open the toggle tooltip on the $side in $annotationMode mode',
                async ({ annotationMode, side }) => {
                    const user = userEvent.setup();
                    renderBlueprint({ annotationMode });

                    await user.hover(screen.getByTestId('bp-AnnotationsControls-toggleBtn'));
                    await screen.findByRole('tooltip');

                    expect(document.querySelector(`[data-side="${side}"]`)).toBeInTheDocument();
                },
            );

            test('should show the drawing colors in the palette in drawing mode', async () => {
                const user = userEvent.setup();
                const onAnnotationColorChange = jest.fn();
                renderBlueprint({ annotationMode: AnnotationMode.DRAWING, onAnnotationColorChange });

                expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toContainElement(
                    screen.getByTestId('bp-color-picker-control'),
                );

                await user.click(screen.getByRole('button', { name: __('drawing_color_red') }));
                expect(onAnnotationColorChange).toHaveBeenCalledWith(AnnotationColor.WATERMELON_RED);
            });

            describe('when a markup starts on the video', () => {
                const surfaces: HTMLElement[] = [];
                const createSurface = (): { layerEl: HTMLDivElement; mediaEl: HTMLVideoElement } => {
                    const containerEl = document.createElement('div');
                    const mediaEl = containerEl.appendChild(document.createElement('video'));
                    const layerEl = containerEl.appendChild(document.createElement('div'));
                    surfaces.push(document.body.appendChild(containerEl));

                    return { layerEl, mediaEl };
                };

                afterEach(() => {
                    surfaces.splice(0).forEach(surfaceEl => surfaceEl.remove());
                });

                test.each([AnnotationMode.DRAWING, AnnotationMode.REGION])(
                    'should dismiss the palette and keep the toggle pressed in %s mode',
                    async mode => {
                        const user = userEvent.setup();
                        const { layerEl, mediaEl } = createSurface();
                        renderBlueprint({ annotationMode: mode, mediaEl });

                        await user.click(layerEl);

                        const toggle = screen.getByTestId('bp-AnnotationsControls-toggleBtn');
                        expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
                        expect(toggle).toHaveAttribute('aria-pressed', 'true');
                        expect(toggle).toHaveAttribute('aria-expanded', 'false');
                    },
                );

                test('should keep the palette open for presses inside it', async () => {
                    const user = userEvent.setup();
                    const { mediaEl } = createSurface();
                    renderBlueprint({ annotationMode: AnnotationMode.DRAWING, mediaEl });

                    await user.click(screen.getByTestId('bp-color-picker-control'));

                    expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toBeInTheDocument();
                });

                test('should bring the palette back when the toggle is hovered after a markup starts', async () => {
                    const user = userEvent.setup();
                    const { layerEl, mediaEl } = createSurface();
                    renderBlueprint({ annotationMode: AnnotationMode.DRAWING, mediaEl });

                    await user.click(layerEl);
                    await user.hover(screen.getByTestId('bp-AnnotationsControls-toggleBtn'));

                    const toggle = screen.getByTestId('bp-AnnotationsControls-toggleBtn');
                    expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toBeInTheDocument();
                    expect(toggle).toHaveAttribute('aria-pressed', 'true');
                    expect(toggle).toHaveAttribute('aria-expanded', 'true');
                });

                test('should bring the palette back when the toggle gets keyboard focus after a markup starts', async () => {
                    const user = userEvent.setup();
                    const { layerEl, mediaEl } = createSurface();
                    renderBlueprint({ annotationMode: AnnotationMode.REGION, mediaEl });

                    await user.click(layerEl);
                    act(() => screen.getByTestId('bp-AnnotationsControls-toggleBtn').focus());

                    expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toBeInTheDocument();
                });

                test('should not open the palette on hover while no mode is on', async () => {
                    const user = userEvent.setup();
                    const { mediaEl } = createSurface();
                    renderBlueprint({ mediaEl });

                    await user.hover(screen.getByTestId('bp-AnnotationsControls-toggleBtn'));

                    expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
                });

                test('should reopen the palette once the toggle exits and re-enters a mode', async () => {
                    const user = userEvent.setup();
                    const { layerEl, mediaEl } = createSurface();
                    const { rerender } = renderBlueprint({ annotationMode: AnnotationMode.DRAWING, mediaEl });

                    await user.click(layerEl);

                    const renderMode = (annotationMode: AnnotationMode): void =>
                        rerender(
                            <VideoControlsV2
                                {...defaultProps}
                                annotationMode={annotationMode}
                                hasDrawing
                                hasRegion
                                isBlueprintEnabled
                                mediaEl={mediaEl}
                                videoAnnotationsEnabled
                            />,
                        );

                    renderMode(AnnotationMode.NONE);
                    renderMode(AnnotationMode.DRAWING);

                    expect(screen.getByTestId('bp-AnnotationsPaletteV2')).toBeInTheDocument();
                });
            });

            test('should call onAnnotationModeEscape on Escape while a mode is active', async () => {
                const user = userEvent.setup();
                const onAnnotationModeEscape = jest.fn();
                renderBlueprint({ annotationMode: AnnotationMode.DRAWING, onAnnotationModeEscape });

                await user.keyboard('{Escape}');
                expect(onAnnotationModeEscape).toHaveBeenCalled();
            });

            test('should hide the annotation controls while in fullscreen', () => {
                jest.spyOn(fullscreen, 'isFullscreen').mockReturnValue(true);
                renderBlueprint({ annotationMode: AnnotationMode.REGION });

                expect(screen.queryByTestId('bp-AnnotationsControls-toggleBtn')).not.toBeInTheDocument();
                expect(screen.queryByTestId('bp-AnnotationsPaletteV2')).not.toBeInTheDocument();
            });

            test('should not render the legacy annotations controls', () => {
                renderBlueprint();
                expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
            });
        });
    });
});
