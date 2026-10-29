import React from 'react';
import { render, screen } from '@testing-library/react';
import { getIcon } from 'box-ui-elements/es/components/preview';
import ErrorIcon from '../ErrorIcon';

jest.mock('box-ui-elements/es/components/preview', () => ({
    getIcon: jest.fn(() => ({ extension }: { extension?: string }) => (
        <span data-extension={extension} data-testid="legacy-icon" />
    )),
}));

describe('lib/viewers/error/ErrorIcon', () => {
    test.each(['pdf', 'zip', 'unknown'])('should render the box-ui-elements icon for %s', extension => {
        render(<ErrorIcon extension={extension} />);

        expect(getIcon).toHaveBeenCalledWith(extension);
        expect(screen.getByTestId('legacy-icon')).toHaveAttribute('data-extension', extension);
    });
});
