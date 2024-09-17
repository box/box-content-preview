import React, { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import audioTracks from '../__mocks__/audioTracks';
import MediaSettings from '../MediaSettings';
import subtitles from '../__mocks__/subtitles';

describe('MediaSettings', () => {
    const renderView = (props = {}) =>
        render(
            <MediaSettings
                autoplay={false}
                onAutoplayChange={jest.fn()}
                onRateChange={jest.fn()}
                rate="1.0"
                {...props}
            />,
        );

    const CustomToggle = forwardRef((): JSX.Element => <button type="button">custom button</button>);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            renderView();

            expect(screen.queryByTitle('Settings')).toBeInTheDocument();
            expect(screen.getByTestId('bp-SettingsToggle-icon')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-flyout')).toBeInTheDocument();
        });

        test('should render custom badge', () => {
            const badge = <div className="custom-badge">custom</div>;
            renderView({ badge, toggle: CustomToggle });

            expect(screen.getByRole('button', { name: 'custom button' }));
        });

        test.each`
            menuItem      | value    | displayValue
            ${'autoplay'} | ${true}  | ${'Enabled'}
            ${'autoplay'} | ${false} | ${'Disabled'}
        `(
            'should display $displayValue as selected for the $menuItem value $value',
            async ({ displayValue, menuItem, value }) => {
                renderView({ [menuItem]: value });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: displayValue })).toHaveAttribute(
                    'aria-checked',
                    'true',
                );
            },
        );

        test.each`
            menuItem  | value    | displayValue
            ${'rate'} | ${'1.0'} | ${__('media_speed_normal')}
            ${'rate'} | ${'2.0'} | ${'2.0'}
        `(
            'should display $displayValue for the $menuItem value $value',
            async ({ displayValue, menuItem, value, title }) => {
                renderView({ [menuItem]: value });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: displayValue })).toHaveAttribute(
                    'aria-checked',
                    'true',
                );
            },
        );

        test.each`
            menuItem     | value     | displayValue
            ${'quality'} | ${'auto'} | ${__('media_quality_auto')}
            ${'quality'} | ${'sd'}   | ${'480p'}
            ${'quality'} | ${'hd'}   | ${'1080p'}
        `('should display $displayValue for the $menuItem value $value', async ({ displayValue, menuItem, value }) => {
            renderView({ [menuItem]: value });

            await userEvent.click(screen.getByTitle('Settings'));

            expect(screen.getByRole('menuitem', { name: `Quality ${displayValue}` })).toBeInTheDocument();
        });

        describe('audiotracks menu', () => {
            test('should render the audio menu if > 1 audio tracks are present', async () => {
                renderView({ audioTracks });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getAllByRole('menuitem', { name: 'Audio' })).toHaveLength(2); // Menu + Back button
            });

            test('should display the generated track label for the selected audio track', async () => {
                renderView({ audioTrack: 1, audioTracks });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: 'Track 1' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'Track 2 (English)' })).toBeInTheDocument();
            });
        });

        describe('quality menu', () => {
            test('should render the quality menu if the quality is provided', async () => {
                renderView({ quality: 'auto', onQualityChange: jest.fn() });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toBeInTheDocument();
                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toHaveAttribute('aria-disabled', 'true');
            });

            test('should render the quality menu disabled based on isHDSupported prop', async () => {
                renderView({ isHDSupported: false, quality: 'auto', onQualityChange: jest.fn() });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toBeInTheDocument();
                expect(screen.getByRole('menuitem', { name: 'Quality Auto' })).toHaveAttribute('aria-disabled', 'true');
            });
        });

        describe('subtitles menu', () => {
            test('should render the subtitles menu item if only 1 subtitles track is present', async () => {
                const onSubtitleChange = jest.fn();
                const singleSubtitle = [{ id: 0, displayLanguage: 'English' }];
                renderView({ onSubtitleChange, subtitles: singleSubtitle });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Subtitles/CC Off' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument();
                expect(screen.queryByRole('menuitemradio', { name: 'Spanish' })).not.toBeInTheDocument();
            });

            test('should render the subtitle menu if > 1 subtitles are present', async () => {
                const onSubtitleChange = jest.fn();
                renderView({ onSubtitleChange, subtitles });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitem', { name: 'Subtitles/CC Off' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toBeInTheDocument();
                expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toHaveAttribute('aria-checked', 'false');
            });

            test('should display the subtitle language for the selected audio track', async () => {
                renderView({ onSubtitleChange: jest.fn(), subtitle: 1, subtitles });

                await userEvent.click(screen.getByTitle('Settings'));

                expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
                expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toHaveAttribute('aria-checked', 'true');
            });
        });
    });
});
