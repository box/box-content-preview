import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CLASS_BOX_PREVIEW_VERSION_BANNER, CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED } from '../constants';
import ComparisonBanner, {
    ComparisonBannerRoot,
    formatComparisonTimestamp,
    getComparisonBannerAuthor,
} from '../ComparisonBanner';

describe('lib/ComparisonBanner', () => {
    describe('formatComparisonTimestamp()', () => {
        test('should return an empty string when the timestamp is missing', () => {
            expect(formatComparisonTimestamp()).toBe('');
            expect(formatComparisonTimestamp('')).toBe('');
        });

        test('should return an empty string when the timestamp is invalid', () => {
            expect(formatComparisonTimestamp('not-a-date')).toBe('');
        });

        test('should format a valid ISO timestamp', () => {
            const formatted = formatComparisonTimestamp('2024-08-22T18:33:00.000Z', 'en-US');
            expect(formatted).toMatch(/Aug/);
            expect(formatted).toMatch(/\d/);
        });
    });

    describe('getComparisonBannerAuthor()', () => {
        test('should prefer modified_by over created_by', () => {
            expect(
                getComparisonBannerAuthor({
                    modified_by: { name: 'Emily Huang' },
                    created_by: { name: 'Someone Else' },
                }),
            ).toBe('Emily Huang');
        });

        test('should fall back to created_by', () => {
            expect(getComparisonBannerAuthor({ created_by: { name: 'Alex' } })).toBe('Alex');
        });

        test('should return an empty string when neither name is present', () => {
            expect(getComparisonBannerAuthor({})).toBe('');
        });
    });

    describe('ComparisonBanner()', () => {
        const file = {
            version_number: '12',
            modified_at: '2024-08-22T18:33:00.000Z',
            modified_by: { name: 'Emily Huang' },
        };

        test('should render badge, timestamp, and author for the current pane', () => {
            const { container } = render(<ComparisonBanner file={file} locale="en-US" />);
            const bannerEl = container.querySelector(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`) as HTMLElement;
            const statusEl = bannerEl.querySelector('[role="status"]') as HTMLElement;

            expect(statusEl).toHaveAttribute('aria-label', __('comparison_banner_current'));
            expect(bannerEl).not.toHaveClass(CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED);
            expect(bannerEl.querySelector('.bp-version-banner-badge')).toHaveTextContent('12');
            expect(bannerEl.querySelector('.bp-version-banner-time')).toHaveTextContent(/Aug/);
            expect(bannerEl.querySelector('.bp-version-banner-author')).toHaveTextContent('Emily Huang');
        });

        test('should not render the actions menu on the current pane', () => {
            render(<ComparisonBanner file={file} locale="en-US" onDownload={jest.fn()} />);

            expect(screen.queryByRole('button', { name: __('comparison_banner_actions') })).not.toBeInTheDocument();
        });

        test('should use the previous-version aria label on the compared pane', () => {
            const { container } = render(<ComparisonBanner file={file} isComparedPreview />);
            const bannerEl = container.querySelector(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`) as HTMLElement;
            const statusEl = bannerEl.querySelector('[role="status"]') as HTMLElement;

            expect(statusEl).toHaveAttribute('aria-label', __('comparison_banner_previous'));
            expect(bannerEl).toHaveClass(CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED);
        });

        test('should download the previewed file from the actions menu', async () => {
            const onDownload = jest.fn();
            const user = userEvent.setup();

            render(<ComparisonBanner file={file} isComparedPreview locale="en-US" onDownload={onDownload} />);

            const menuButton = screen.getByRole('button', { name: __('comparison_banner_actions') });
            expect(menuButton).toHaveAttribute('data-target-id', 'ComparisonBanner-openActions');

            await user.click(menuButton);

            const downloadItem = screen.getByRole('menuitem', { name: __('download') });
            expect(downloadItem).toHaveAttribute('data-target-id', 'ComparisonBanner-download');

            await user.click(downloadItem);

            expect(onDownload).toHaveBeenCalledTimes(1);
        });

        test('should promote and delete the compared version from the actions menu', async () => {
            const onDelete = jest.fn();
            const onMakeCurrent = jest.fn();
            const user = userEvent.setup();

            render(
                <ComparisonBanner
                    file={file}
                    isComparedPreview
                    locale="en-US"
                    onDelete={onDelete}
                    onMakeCurrent={onMakeCurrent}
                />,
            );

            await user.click(screen.getByRole('button', { name: __('comparison_banner_actions') }));

            const makeCurrentItem = screen.getByRole('menuitem', { name: __('comparison_banner_make_current') });
            expect(makeCurrentItem).toHaveAttribute('data-target-id', 'ComparisonBanner-makeCurrent');
            await user.click(makeCurrentItem);
            expect(onMakeCurrent).toHaveBeenCalledTimes(1);

            await user.click(screen.getByRole('button', { name: __('comparison_banner_actions') }));
            const deleteItem = screen.getByRole('menuitem', { name: __('comparison_banner_delete') });
            expect(deleteItem).toHaveAttribute('data-target-id', 'ComparisonBanner-delete');
            await user.click(deleteItem);
            expect(onDelete).toHaveBeenCalledTimes(1);
        });

        test('should leave side-by-side comparison from the actions menu', async () => {
            const onOpenFullPreview = jest.fn();
            const user = userEvent.setup();

            render(
                <ComparisonBanner file={file} isComparedPreview locale="en-US" onOpenFullPreview={onOpenFullPreview} />,
            );

            await user.click(screen.getByRole('button', { name: __('comparison_banner_actions') }));

            const openFullPreviewItem = screen.getByRole('menuitem', {
                name: __('comparison_banner_open_full_preview'),
            });
            expect(openFullPreviewItem).toHaveAttribute('data-target-id', 'ComparisonBanner-openFullPreview');

            await user.click(openFullPreviewItem);

            expect(onOpenFullPreview).toHaveBeenCalledTimes(1);
        });

        test('should leave side-by-side comparison from the close button', async () => {
            const onOpenFullPreview = jest.fn();
            const user = userEvent.setup();

            const { container } = render(
                <ComparisonBanner file={file} isComparedPreview locale="en-US" onOpenFullPreview={onOpenFullPreview} />,
            );

            const closeButton = screen.getByRole('button', { name: __('comparison_banner_close') });
            expect(closeButton).toHaveAttribute('data-target-id', 'ComparisonBanner-close');
            expect(container.querySelector('.bp-version-banner-divider')).toBeInTheDocument();

            await user.click(closeButton);

            expect(onOpenFullPreview).toHaveBeenCalledTimes(1);
        });

        test('should not render the close button or divider without an open full preview handler', () => {
            const { container } = render(
                <ComparisonBanner file={file} isComparedPreview locale="en-US" onDownload={jest.fn()} />,
            );

            expect(screen.queryByRole('button', { name: __('comparison_banner_close') })).not.toBeInTheDocument();
            expect(container.querySelector('.bp-version-banner-divider')).toBeNull();
        });

        test('should use the on-dark button variant only when requested', () => {
            const { rerender } = render(
                <ComparisonBanner file={file} isComparedPreview locale="en-US" onDownload={jest.fn()} />,
            );
            const getMenuButton = (): HTMLElement =>
                screen.getByRole('button', { name: __('comparison_banner_actions') });

            expect(getMenuButton().className).not.toMatch(/on-dark/);

            rerender(<ComparisonBanner file={file} isComparedPreview isOnDark locale="en-US" onDownload={jest.fn()} />);

            expect(getMenuButton().className).toMatch(/on-dark/);
        });

        test('should not let actions menu keydown events reach document listeners', async () => {
            const onDocumentKeyDown = jest.fn();
            const user = userEvent.setup();

            document.addEventListener('keydown', onDocumentKeyDown);

            try {
                render(<ComparisonBanner file={file} isComparedPreview locale="en-US" onDownload={jest.fn()} />);

                const menuButton = screen.getByRole('button', { name: __('comparison_banner_actions') });

                act(() => menuButton.focus());
                await user.keyboard('{Enter}');

                expect(screen.getByRole('menuitem', { name: __('download') })).toBeInTheDocument();

                await user.keyboard('{ArrowDown}');

                expect(onDocumentKeyDown).not.toHaveBeenCalled();

                await user.keyboard('{Escape}');
                document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));

                expect(onDocumentKeyDown).toHaveBeenCalledTimes(1);
            } finally {
                document.removeEventListener('keydown', onDocumentKeyDown);
            }
        });

        test('should render nothing when version content is missing', () => {
            const { container } = render(<ComparisonBanner file={{}} />);

            expect(container.querySelector(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`)).toBeNull();
            expect(container.firstChild).toBeNull();
        });
    });

    describe('ComparisonBannerRoot()', () => {
        test('should mount, replace, and unmount the banner in the container', () => {
            const containerEl = document.createElement('div');
            const root = new ComparisonBannerRoot(containerEl);

            act(() => {
                root.render({ version_number: '1' });
            });
            expect(containerEl.querySelector('.bp-version-banner-badge')).toHaveTextContent('1');

            act(() => {
                root.render({ version_number: '2' });
            });
            expect(containerEl.querySelectorAll(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`)).toHaveLength(1);
            expect(containerEl.querySelector('.bp-version-banner-badge')).toHaveTextContent('2');

            act(() => {
                root.destroy();
            });
            expect(containerEl.querySelector(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`)).toBeNull();
            expect(containerEl.childElementCount).toBe(0);
        });
    });
});
