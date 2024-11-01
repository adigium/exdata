import { LayerResult, RequestDetails, WeightLayersRequirements } from '../types';
import { BaseLayer } from './BaseLayer';

export class WeightLayer extends BaseLayer<WeightLayersRequirements> {
  override async process(requestDetails: RequestDetails<WeightLayersRequirements>): Promise<LayerResult> {
    const keyPart = 'weight';

    if (requestDetails.weight === undefined || requestDetails.weight === null) return { proceed: false };

    return {
      proceed: true,
      key: keyPart,
    };
  }
}
