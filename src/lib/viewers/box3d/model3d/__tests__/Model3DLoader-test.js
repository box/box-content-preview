/* eslint-disable no-unused-expressions */
import Model3DLoader from '../Model3DLoader';
import Browser from '../../../../Browser';
import PreviewError from '../../../../PreviewError';

let file;

describe('lib/viewers/box3d/model3d/Model3DLoader', () => {
    beforeEach(() => {
        file = {
            extension: 'box3d',
            name: 'blah.box3d',
            representations: {
                entries: [
                    {
                        representation: '3d',
                    },
                ],
            },
        };
    });

    describe('determineViewer()', () => {
        test("should throw an error if browser doesn't support 3D and it is a 3d file", () => {
            jest.spyOn(Browser, 'supportsModel3D').mockReturnValue(false);
            expect(() => Model3DLoader.determineViewer(file)).toThrowError(PreviewError);
        });

        test("should not throw an error if browser doesn't support 3D and it is a non 3d file", () => {
            file = {
                extension: 'pdf',
                name: 'blah.pdf',
                representations: {
                    entries: [
                        {
                            representation: 'pdf',
                        },
                    ],
                },
            };

            jest.spyOn(Browser, 'supportsModel3D').mockReturnValue(false);
            expect(() => Model3DLoader.determineViewer(file)).not.toThrowError(PreviewError);
        });

        test('should return viewer if browser supports 3D', () => {
            jest.spyOn(Browser, 'supportsModel3D').mockReturnValue(true);
            expect(Model3DLoader.determineViewer(file)).toBe(Model3DLoader.viewers[0]);
        });
    });
});
