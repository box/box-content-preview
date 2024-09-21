import React, { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import audioTracks from '../__mocks__/audioTracks';
import MediaSettings from '../MediaSettings';
import { Quality } from '../MediaSettingsMenuQuality';
import subtitles from '../__mocks__/subtitles';

describe('MediaSettings', () => {
    const CustomToggle = forwardRef((): JSX.Element => <button type="button">custom button</button>);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            render(<MediaSettings autoplay={false} onAutoplayChange={jest.fn()} onRateChange={jest.fn()} rate="1.0" />);

            expect(screen.queryByTitle('Settings')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-toggle-icon')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-flyout')).toBeInTheDocument();
        });

        test('should render custom badge', () => {
            render(
                <MediaSettings
                    autoplay={false}
                    badge={<div className="custom-badge">custom</div>}
                    onAutoplayChange={jest.fn()}
                    onRateChange={jest.fn()}
                    rate="1.0"
                    toggle={CustomToggle}
                />,
            );

            expect(screen.getByRole('button', { name: 'custom button' }));
        });

        test.each`
            value    | displayValue
            ${true}  | ${'Enabled'}
            ${false} | ${'Disabled'}
        `(
            'should display $displayValue as selected for the $menuItem value $value',
            async ({ displayValue, value }) => {
                const user = userEvent.setup();
                render(
                    <MediaSettings autoplay={value} onAutoplayChange={jest.fn()} onRateChange={jest.fn()} rate="1.0" />,
                );
                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: displayValue })).toHaveAttribute(
                    'aria-checked',
                    'true',
                );
            },
        );

        test.each`
            value    | displayValue
            ${'1.0'} | ${__('media_speed_normal')}
            ${'2.0'} | ${'2.0'}
        `('should display $displayValue for the $menuItem value $value', async ({ displayValue, value }) => {
            const user = userEvent.setup();
            render(
                <MediaSettings autoplay={value} onAutoplayChange={jest.fn()} onRateChange={jest.fn()} rate={value} />,
            );

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByRole('menuitemradio', { name: displayValue })).toHaveAttribute('aria-checked', 'true');
        });

        test.each`
            value     | displayValue
            ${'auto'} | ${__('media_quality_auto')}
            ${'sd'}   | ${'480p'}
            ${'hd'}   | ${'1080p'}
        `('should display $displayValue for the $menuItem value $value', async ({ displayValue, value }) => {
            const user = userEvent.setup();
            render(
                <MediaSettings
                    autoplay={false}
                    onAutoplayChange={jest.fn()}
                    onRateChange={jest.fn()}
                    quality={value}
                    rate="1.0"
                />,
            );

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByRole('menuitem', { name: `Quality ${displayValue}` })).toBeInTheDocument();
        });

        describe('audiotracks menu', () => {
            test('should render the audio menu if > 1 audio tracks are present', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        audioTracks={audioTracks}
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onRateChange={jest.fn()}
                        rate="1.0"
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getAllByRole('menuitem', { name: 'Audio' })).toHaveLength(2); // Menu + Back button
            });

            test('should display the generated track label for the selected audio track', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        audioTrack={1}
                        audioTracks={audioTracks}
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onRateChange={jest.fn()}
                        rate="1.0"
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: 'Track 1' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'Track 2 (English)' })).toBeInTheDocument();
            });
        });

        describe('quality menu', () => {
            test('should render the quality menu if the quality is provided', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onQualityChange={jest.fn()}
                        onRateChange={jest.fn()}
                        quality={Quality.AUTO}
                        rate="1.0"
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toBeInTheDocument();
                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toHaveAttribute('aria-disabled', 'true');
            });

            test('should render the quality menu disabled based on isHDSupported prop', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        autoplay={false}
                        isHDSupported={false}
                        onAutoplayChange={jest.fn()}
                        onQualityChange={jest.fn()}
                        onRateChange={jest.fn()}
                        quality={Quality.AUTO}
                        rate="1.0"
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toBeInTheDocument();
                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toHaveAttribute('aria-disabled', 'true');
            });
        });

        describe('subtitles menu', () => {
            test('should render the subtitles menu item if only 1 subtitles track is present', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onRateChange={jest.fn()}
                        onSubtitleChange={jest.fn()}
                        rate="1.0"
                        subtitles={[{ id: 0, displayLanguage: 'English' }]}
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Subtitles/CC Off' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument();
                expect(screen.queryByRole('menuitemradio', { name: 'Spanish' })).not.toBeInTheDocument();
            });

            test('should render the subtitle menu if > 1 subtitles are present', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onRateChange={jest.fn()}
                        onSubtitleChange={jest.fn()}
                        rate="1.0"
                        subtitles={subtitles}
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Subtitles/CC Off' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toHaveAttribute('aria-checked', 'false');
            });

            test('should display the subtitle language for the selected audio track', async () => {
                const user = userEvent.setup();
                render(
                    <MediaSettings
                        autoplay={false}
                        onAutoplayChange={jest.fn()}
                        onRateChange={jest.fn()}
                        onSubtitleChange={jest.fn()}
                        rate="1.0"
                        subtitle={1}
                        subtitles={subtitles}
                    />,
                );

                await user.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toHaveAttribute('aria-checked', 'true');
            });
        });
    });
});
