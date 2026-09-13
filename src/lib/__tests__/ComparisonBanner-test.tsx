import React from 'react';
import { act, render } from '@testing-library/react';
import { CLASS_BOX_PREVIEW_VERSION_BANNER } from '../constants';
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

            expect(bannerEl).toHaveAttribute('role', 'status');
            expect(bannerEl).toHaveAttribute('aria-label', __('comparison_banner_current'));
            expect(bannerEl.querySelector('.bp-version-banner-badge')).toHaveTextContent('12');
            expect(bannerEl.querySelector('.bp-version-banner-time')).toHaveTextContent(/Aug/);
            expect(bannerEl.querySelector('.bp-version-banner-author')).toHaveTextContent('Emily Huang');
        });

        test('should use the previous-version aria label on the compared pane', () => {
            const { container } = render(<ComparisonBanner file={file} isComparedPreview />);
            const bannerEl = container.querySelector(`.${CLASS_BOX_PREVIEW_VERSION_BANNER}`) as HTMLElement;

            expect(bannerEl).toHaveAttribute('aria-label', __('comparison_banner_previous'));
        });

        test('should omit missing fields', () => {
            const { container } = render(<ComparisonBanner file={{}} />);

            expect(container.querySelector('.bp-version-banner-badge')).toBeNull();
            expect(container.querySelector('.bp-version-banner-info')).toBeNull();
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
