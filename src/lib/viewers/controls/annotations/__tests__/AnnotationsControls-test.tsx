import React from 'react';
import { shallow } from 'enzyme';
import AnnotationsControls from '../AnnotationsControls';

describe('AnnotationsControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onClick = jest.fn();
            const wrapper = shallow(<AnnotationsControls fileId="test" onAnnotationModeClick={onClick} />);

            expect(wrapper.hasClass('bp-AnnotationsControls')).toBe(true);
        });
    });
});
