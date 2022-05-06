import React from 'react';
import { ReactWrapper, mount } from 'enzyme';

import AnnotationsButtonRegionTooltips from '../AnnotationsButtonRegionTooltips';

jest.mock('react', () => {
    const originalModule = jest.requireActual('react');
    return {
        ...originalModule,
        useContext: jest.fn(),
    };
});

describe('AnnotationsButtonRegionTooltips', () => {
    const contextMock = {
        experiences: {
            persistentOnboardingBoxEditAnnotations: {
                canShow: true,
                onClose: jest.fn(),
                onComplete: jest.fn(),
                onShow: jest.fn(),
            },
        },
        setIsForced: jest.fn(),
    };

    jest.spyOn(React, 'useContext').mockReturnValue(contextMock);

    const getWrapper = (props = {}): ReactWrapper =>
        mount(
            <AnnotationsButtonRegionTooltips isEnabled {...props}>
                Child
            </AnnotationsButtonRegionTooltips>,
        );

    test('should render PersistentOnboardingBoxEditAnnotationsTooltip when Persistent Onboarding experience can show', () => {
        contextMock.experiences.persistentOnboardingBoxEditAnnotations.canShow = true;

        const wrapper = getWrapper();

        expect(wrapper.children().name()).toBe('PersistentOnboardingBoxEditAnnotationsTooltip');
    });

    test('should render AnnotationsFlowTooltip when Persistent Onboarding experience cannot show', () => {
        contextMock.experiences.persistentOnboardingBoxEditAnnotations.canShow = false;

        const wrapper = getWrapper();

        expect(wrapper.children().name()).toBe('AnnotationsFlowTooltip');
    });
});
