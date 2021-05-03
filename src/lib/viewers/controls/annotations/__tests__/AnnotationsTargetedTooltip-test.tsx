import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import AnnotationsTargetedTooltip from '../AnnotationsTargetedTooltip';

const mockUseContext = jest.fn().mockImplementation(() => ({
    experiences: {
        tooltipFlowAnnotationsExperience: {
            canShow: true,
            onClose: jest.fn(),
            onComplete: jest.fn(),
            onShow: jest.fn(),
        },
    },
    setIsForced: jest.fn(),
}));

React.useContext = mockUseContext;

describe('AnnotationsTargetedTooltip', () => {
    const getWrapper = (props = {}): ReactWrapper =>
        mount(
            <AnnotationsTargetedTooltip {...props}>
                <div>Child</div>
            </AnnotationsTargetedTooltip>,
        );

    describe('render', () => {
        test('should return tooltip when is enabled', () => {
            const wrapper = getWrapper({
                isEnabled: true,
            });

            expect(wrapper.children().text()).not.toBe('Child');
            expect(wrapper.children().prop('shouldTarget')).toBe(true);
            expect(wrapper.children().prop('body')).toBeTruthy();
            expect(wrapper.children().prop('title')).toBeTruthy();
            expect(wrapper.children().prop('useTargetingApi')().canShow).toBe(true);
        });

        test('should return children when tooltip is disabled', () => {
            const wrapper = getWrapper({
                isEnabled: false,
            });

            expect(wrapper.children().text()).toBe('Child');
            expect(wrapper.children().prop('shouldTarget')).toBe(undefined);
        });
    });
});
