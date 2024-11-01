import { EndpointLayersRequirements, RequestDetails } from '../types';
import { BaseLayer } from './BaseLayer';

export class EndpointTargetLayer extends BaseLayer<EndpointLayersRequirements> {
  async process(requestDetails: RequestDetails<EndpointLayersRequirements>) {
    const proceed = !!requestDetails.endpoint;
    const keyPart = `(${requestDetails.endpoint})`;

    return {
      proceed,
      key: keyPart,
    };
  }
}
