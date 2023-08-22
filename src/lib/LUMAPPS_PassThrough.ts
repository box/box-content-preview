import axios from 'axios';
// eslint-disable-next-line prettier/prettier
import type { LumAppsContext, PassThroughData } from './LUMAPPS_types';


const lumappsPassThrough = async (
    LumAppsContext: LumAppsContext,
    connectorId: string,
    // connectorId: string ='f162a4ff-810b-43a7-a0f8-6888d25e37e2',
    PassThroughData: PassThroughData,
) => {
    const { baseUrl, haussmannCell, organizationId, token } = LumAppsContext;

    // const haussmannCell = 'https://go-cell-001.beta.api.lumapps.com'
    // const baseUrl = 'https://csbx-us.lumapps.com'
    // const organizationId = '8266017111862228'
    // const token = ''

    return axios.post(
        `${haussmannCell}/v2/organizations/${organizationId}/integrations/box/connectors/${connectorId}/call?baseUrl=${baseUrl}`,
        PassThroughData,
        { headers: { Authorization: `Bearer ${token}` } },
    );
};
export default lumappsPassThrough
