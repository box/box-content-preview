import get from 'lodash/get';

type FeatureOptions = {
    [key: string]: {};
};

type FeatureConfig = {
    [key: string]: FeatureOptions;
};

const isFeatureEnabled = (features: FeatureConfig, featureName: string): boolean => {
    return !!get(features, featureName, false);
};

const getFeatureConfig = (features: FeatureConfig, featureName: string): FeatureConfig => {
    return get(features, featureName, {});
};

export { isFeatureEnabled, getFeatureConfig };
