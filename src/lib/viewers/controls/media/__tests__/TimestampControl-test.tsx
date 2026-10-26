import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import TimestampControl from '../TimestampControl';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('TimestampControl', () => {
    let mediaContainer: HTMLDivElement;
    let videoEl: HTMLVideoElement;

    beforeEach(() => {
        mediaContainer = document.createElement('div');
        mediaContainer.className = 'bp-media-container';
        videoEl = document.createElement('video');
        // jsdom does not implement HTMLMediaElement.paused; pin it so the
        // animation-frame updater does not treat the element as playing.
        Object.defineProperty(videoEl, 'paused', { configurable: true, value: true });
        mediaContainer.appendChild(videoEl);
        document.body.appendChild(mediaContainer);
    });

    afterEach(() => {
        mediaContainer.remove();
    });

    const getWrapper = (props = {}) =>
        render(
            <TimestampControl
                canChangeTimeFormat
                currentTime={65}
                durationTime={120}
                fps={24}
                mediaEl={videoEl}
                {...props}
            />,
        );

    const getButton = () => screen.getByTestId('bp-TimestampControl-button');

    describe('render', () => {
        test('should render current and duration time in standard format by default', () => {
            getWrapper();
            expect(getButton()).toHaveTextContent('1:05/2:00');
        });

        test('should render only current time when isNarrowWidth is true', () => {
            getWrapper({ isNarrowWidth: true });

            expect(getButton()).toHaveTextContent('1:05');
            expect(getButton()).not.toHaveTextContent('/');
        });

        test('should not render the flyout by default', () => {
            getWrapper();
            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });

        test('should render the legacy chevrons by default', async () => {
            const user = userEvent.setup();
            getWrapper();

            expect(screen.getByTestId('IconChevronDownMedium24')).toHaveClass('bp-TimestampControl-chevron');

            await user.click(getButton());
            expect(screen.getByTestId('IconChevronUpMedium24')).toHaveClass('bp-TimestampControl-chevron');
        });
    });

    describe('when isBlueprintEnabled is true', () => {
        beforeAll(() => {
            mockResizeObserver();
        });

        const getBlueprintWrapper = (props = {}) =>
            render(
                <TimestampControl
                    canChangeTimeFormat
                    currentTime={65}
                    durationTime={120}
                    fps={24}
                    isBlueprintEnabled
                    mediaEl={videoEl}
                    {...props}
                />,
                {
                    wrapper: ({ children }) => (
                        <BlueprintProviders container={mediaContainer}>{children}</BlueprintProviders>
                    ),
                },
            );

        test('should render the time as Blueprint text with a Blueprint chevron', () => {
            getBlueprintWrapper();

            expect(getButton()).toHaveTextContent('1:05/2:00');
            expect(getButton().querySelectorAll('[data-typography]')).toHaveLength(3);
            expect(getButton().querySelector('.bp-TimestampControl-chevron path')).toHaveAttribute(
                'fill',
                'rgba(255, 255, 255, 0.8)',
            );
            expect(screen.queryByTestId('IconChevronDownMedium24')).not.toBeInTheDocument();
        });

        test('should render each digit of the current time and duration in a fixed-width box', () => {
            getBlueprintWrapper();

            const digits = Array.from(getButton().querySelectorAll('.bp-TabularDigit'));
            expect(digits.map(digit => digit.textContent)).toEqual(['1', '0', '5', '2', '0', '0']);
        });

        test('should render only current time when isNarrowWidth is true', () => {
            getBlueprintWrapper({ isNarrowWidth: true });

            expect(getButton()).toHaveTextContent('1:05');
            expect(getButton()).not.toHaveTextContent('/');
        });

        test('should render static Blueprint text when canChangeTimeFormat is false', () => {
            getBlueprintWrapper({ canChangeTimeFormat: false });

            const timestamp = screen.getByTestId('bp-TimestampControl-static');
            expect(timestamp).toHaveTextContent('1:05/2:00');
            expect(timestamp.querySelectorAll('[data-typography]')).toHaveLength(3);
            expect(screen.queryByTestId('bp-TimestampControl-button')).not.toBeInTheDocument();
        });

        test('should open a Blueprint menu with the current format checked', async () => {
            const user = userEvent.setup();
            getBlueprintWrapper();

            await user.click(getButton());

            const menu = screen.getByRole('menu');
            expect(mediaContainer).toContainElement(menu);
            expect(getButton()).toHaveAttribute('aria-expanded', 'true');
            expect(getButton()).toHaveAttribute('data-resin-target', 'timeFormat');
            expect(screen.getByText(__('media_time_format'))).toBeInTheDocument();
            expect(screen.getByRole('menuitemradio', { name: 'Standard time' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
            expect(screen.getByRole('menuitemradio', { name: 'Timecode' })).toHaveAttribute(
                'data-resin-target',
                'timeFormat-timecode',
            );
            expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
        });

        test('should change the format and close the menu on selection', async () => {
            const user = userEvent.setup();
            getBlueprintWrapper({ currentTime: 61.5, fps: 30 });

            await user.click(getButton());
            await user.click(screen.getByRole('menuitemradio', { name: 'Timecode' }));

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(getButton()).toHaveTextContent('00:01:01:15/00:02:00:00');
            expect(mediaContainer.getAttribute('data-time-format')).toBe('timecode');
        });

        test('should display frame numbers when selected', async () => {
            const user = userEvent.setup();
            getBlueprintWrapper({ currentTime: 10 });

            await user.click(getButton());
            await user.click(screen.getByRole('menuitemradio', { name: 'Frame numbers' }));

            expect(getButton()).toHaveTextContent('240/2880');
        });

        test('should close the menu on Escape and return focus to the trigger', async () => {
            const user = userEvent.setup();
            getBlueprintWrapper();

            await user.click(getButton());
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(getButton()).toHaveFocus();
        });

        test('should keep menu keys from reaching the viewer shortcuts', async () => {
            const user = userEvent.setup();
            const onDocumentKeyDown = jest.fn();
            document.addEventListener('keydown', onDocumentKeyDown);
            getBlueprintWrapper();

            getButton().focus();
            await user.keyboard('{ArrowDown}');
            expect(screen.getByRole('menu')).toBeInTheDocument();

            await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');

            expect(onDocumentKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onDocumentKeyDown);
        });

        test('should close the menu on Escape without the key reaching the document', async () => {
            const user = userEvent.setup();
            const onDocumentKeyDown = jest.fn();
            getBlueprintWrapper();

            await user.click(getButton());
            document.addEventListener('keydown', onDocumentKeyDown);
            await user.keyboard('{Escape}');

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            expect(onDocumentKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onDocumentKeyDown);
        });

        test('should keep ArrowUp on the trigger from reaching the viewer shortcuts', async () => {
            const user = userEvent.setup();
            const onDocumentKeyDown = jest.fn();
            document.addEventListener('keydown', onDocumentKeyDown);
            getBlueprintWrapper();

            getButton().focus();
            await user.keyboard('{ArrowUp}');

            expect(onDocumentKeyDown).not.toHaveBeenCalled();
            document.removeEventListener('keydown', onDocumentKeyDown);
        });
    });

    describe('when canChangeTimeFormat is false', () => {
        test('should render static standard time without a dropdown', () => {
            getWrapper({ canChangeTimeFormat: false });

            expect(screen.getByTestId('bp-TimestampControl-static')).toBeInTheDocument();
            expect(screen.getByTestId('bp-TimestampControl-static')).toHaveTextContent('1:05/2:00');
            expect(screen.queryByTestId('bp-TimestampControl-button')).not.toBeInTheDocument();
        });

        test('should render only current time when isNarrowWidth is true', () => {
            getWrapper({ canChangeTimeFormat: false, isNarrowWidth: true });

            expect(screen.getByTestId('bp-TimestampControl-static')).toHaveTextContent('1:05');
            expect(screen.getByTestId('bp-TimestampControl-static')).not.toHaveTextContent('/');
        });
    });

    describe('dropdown', () => {
        test('should open the flyout with 3 format options when clicked', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());

            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Standard time' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Timecode' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Frame numbers' })).toBeInTheDocument();
        });

        test('should mark the current format as selected', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());

            expect(screen.getByRole('option', { name: 'Standard time' })).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByRole('option', { name: 'Timecode' })).toHaveAttribute('aria-selected', 'false');
        });

        test('should close the flyout on selection', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));

            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });

        test('should close the flyout on outside click', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();

            await user.click(document.body);
            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });

        test('should close the flyout on Escape', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.keyboard('{Escape}');

            expect(screen.queryByTestId('bp-TimestampControl-flyout')).not.toBeInTheDocument();
        });
    });

    describe('formats', () => {
        test('should display timecode format when selected', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 61.5, durationTime: 120, fps: 30 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));

            expect(getButton()).toHaveTextContent('00:01:01:15/00:02:00:00');
        });

        test('should display frame numbers format when selected', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 10, durationTime: 120, fps: 24 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Frame numbers' }));

            expect(getButton()).toHaveTextContent('240/2880');
        });

        test('should return to standard time format when selected', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));
            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Standard time' }));

            expect(getButton()).toHaveTextContent('1:05/2:00');
        });

        test('should use the provided fps for frame calculation', async () => {
            const user = userEvent.setup();
            getWrapper({ currentTime: 2, durationTime: 10, fps: 60 });

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Frame numbers' }));

            expect(getButton()).toHaveTextContent('120/600');
        });
    });

    describe('data attributes', () => {
        test('should set data-time-format on the media container when format changes', async () => {
            const user = userEvent.setup();
            getWrapper();

            expect(mediaContainer.getAttribute('data-time-format')).toBe('standard');

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Timecode' }));

            expect(mediaContainer.getAttribute('data-time-format')).toBe('timecode');
        });

        test('should set data-fps on the media container', () => {
            getWrapper({ fps: 30 });
            expect(mediaContainer.getAttribute('data-fps')).toBe('30');
        });

        test('should update data-time-format to frames when selected', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(getButton());
            await user.click(screen.getByRole('option', { name: 'Frame numbers' }));

            expect(mediaContainer.getAttribute('data-time-format')).toBe('frames');
        });

        test('should not set data attributes when mediaEl is not provided', () => {
            render(<TimestampControl currentTime={65} durationTime={120} fps={24} />);
            expect(mediaContainer.hasAttribute('data-time-format')).toBe(false);
        });
    });
});
