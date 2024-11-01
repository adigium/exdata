import { EndpointLayersRequirements, LayerResult, RequestDetails } from '../types';
import { BaseLayer } from './BaseLayer';

export class EndpointGroupLayer extends BaseLayer<EndpointLayersRequirements> {
  constructor(private group: string) {
    super();
  }

  async process(requestDetails: RequestDetails<EndpointLayersRequirements>): Promise<LayerResult> {
    const proceed = !!requestDetails.endpoint && requestDetails.endpoint.includes(this.group);

    return {
      proceed,
      key: undefined,
    };
  }
}
