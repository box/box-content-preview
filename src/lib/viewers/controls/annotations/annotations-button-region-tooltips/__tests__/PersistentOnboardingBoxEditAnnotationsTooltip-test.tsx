import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import i18n from '../../../../../i18n';

import PersistentOnboardingBoxEditAnnotationsTooltip from '../PersistentOnboardingBoxEditAnnotationsTooltip';

jest.mock('react', () => {
    const originalModule = jest.requireActual('react');
    return {
        ...originalModule,
        useContext: jest.fn(),
    };
});

jest.mock('../../../../../i18n', () => ({
    __esModule: true,
    default: {
        currentLocale: undefined,
    },
}));

describe('PersistentOnboardingBoxEditAnnotationsTooltip', () => {
    const contextMock = {
        experiences: {
            persistentOnboardingBoxEditAnnotations: {
                canShow: true,
                onClose: jest.fn(),
                onComplete: jest.fn(),
                onShow: jest.fn(),
                onPrevious: jest.fn(),
            },
        },
        setIsForced: jest.fn(),
    };

    const getWrapper = (props = {}): ReactWrapper =>
        mount(
            <PersistentOnboardingBoxEditAnnotationsTooltip isEnabled {...props}>
                Child
            </PersistentOnboardingBoxEditAnnotationsTooltip>,
        );

    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(React, 'useContext').mockReturnValue(contextMock);
    });

    test('should properly render the tooltip', () => {
        const wrapper = getWrapper({
            isEnabled: true,
        });

        expect(wrapper.children().prop('body')).toBe(__('persistent_onboarding_box_edit_annotations_tooltip_body'));
        expect(wrapper.children().prop('title')).toBe(__('persistent_onboarding_box_edit_annotations_tooltip_title'));
        expect(wrapper.children().prop('primaryButtonProps').children).toBe(
            __('persistent_onboarding_box_edit_annotations_tooltip_button_next'),
        );
        expect(wrapper.children().prop('secondaryButtonProps').children).toBe(
            __('persistent_onboarding_box_edit_annotations_tooltip_button_previous'),
        );
        expect(wrapper.children().prop('shouldTarget')).toBe(true);
        expect(wrapper.children().prop('useTargetingApi')().canShow).toBe(true);
    });

    describe('should properly apply is-localized CSS class on the image', () => {
        test('should apply it when locale is set to language different than English', () => {
            i18n.currentLocale = 'pl';

            const wrapper = getWrapper();

            expect(wrapper.children().prop('image').props.className).toContain('is-localized');
        });

        test('should NOT apply it when locale is set English language', () => {
            i18n.currentLocale = 'en';

            const wrapper = getWrapper();

            expect(wrapper.children().prop('image').props.className).not.toContain('bp-is-localized');
        });
    });

    test("should call setIsForced(false) on useTargetingApi's callbacks", () => {
        const wrapper = getWrapper();
        const targetingApi = wrapper.children().prop('useTargetingApi')();
        contextMock.setIsForced.mockReset();

        targetingApi.onComplete();
        targetingApi.onClose();
        targetingApi.onShow();

        expect(contextMock.setIsForced).toHaveBeenCalledTimes(3);
    });
});
