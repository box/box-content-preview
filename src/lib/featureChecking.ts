import get from 'lodash/get';

/* NOTES:
 - Right now this uses the same types as BUIE but should look into using something more
specific to constrain it more
*/
type FeatureOptions = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

type FeatureConfig = {
    [key: string]: FeatureOptions;
};

/* NOTES:
 - isFeatureEnabled and getFeatureConfig were copied from BUIE
 - BUIE also has other methods for accessing features but these seemed like the ones
most commonly used for Preview features
*/
function isFeatureEnabled(features: FeatureConfig, featureName: string): boolean {
    return !!get(features, featureName, false);
}

function getFeatureConfig(features: FeatureConfig, featureName: string): FeatureConfig {
    return get(features, featureName, {});
}

export { isFeatureEnabled, getFeatureConfig };
