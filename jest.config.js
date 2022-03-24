module.exports = {
    clearMocks: true,
    collectCoverage: false,
    globals: {
        __NAME__: 'name',
        __VERSION__: 'version',
        __LANGUAGE__: 'en-US',
    },
    moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
    moduleNameMapper: {
        '\\.(css|scss|less)$': '<rootDir>/build/jest/styleMock.js',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2)$': '<rootDir>/build/jest/fileMock.js',
        '@box/react-virtualized/dist/es': '@box/react-virtualized/dist/commonjs',
        'box-elements-messages': '<rootDir>/build/jest/i18nMock.js',
        'react-intl': '<rootDir>/build/jest/react-intl-mock.js',
        'react-intl-locale-data': '<rootDir>/node_modules/react-intl/locale-data/en.js',
        THREE: '<rootDir>/src/third-party/model3d/1.12.0/three.min.js',
    },
    restoreMocks: true,
    roots: ['src'],
    setupFiles: [
        '<rootDir>/build/jest/envGlobals.js',
        '<rootDir>/build/jest/envWindow.js',
        'jest-canvas-mock',
        'mock-local-storage',
    ],
    setupFilesAfterEnv: ['<rootDir>/build/jest/envSetup.js'],
    testPathIgnorePatterns: ['node_modules', 'dist', '__mocks__'],
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
        '^.+\\.(svg|html)$': '<rootDir>/build/jest/stringLoader.js',
    },
    transformIgnorePatterns: ['node_modules/(?!(box-ui-elements|react-virtualized)/)'],
};
