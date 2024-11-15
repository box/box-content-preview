import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaToggle from '../MediaToggle';

describe('MediaToggle', () => {
    const getWrapper = (props = {}, outerHandleKeyDown = jest.fn()) =>
        render(
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div onKeyDown={outerHandleKeyDown}>
                <MediaToggle {...props} />
            </div>,
        );
    const getToggle = async () => screen.findByRole('button');

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            const className = 'test';
            getWrapper({ className });
            const toggle = await getToggle();

            expect(toggle).toBeInTheDocument();
            expect(toggle).toHaveClass(className);
        });

        test.each(['Enter', 'Space'])('should defer to the inner button for the %s key', async key => {
            const outerHandleKeyDown = jest.fn();
            getWrapper({}, outerHandleKeyDown);

            await userEvent.keyboard(`{${key}}`);

            expect(outerHandleKeyDown).not.toHaveBeenCalled();
        });
    });
});
