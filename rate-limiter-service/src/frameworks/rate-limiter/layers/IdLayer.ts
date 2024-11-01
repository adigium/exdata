import { IdLayersRequirements, RequestDetails } from '../types';
import { BaseLayer } from './BaseLayer';

export class IdLayer extends BaseLayer<IdLayersRequirements> {
  constructor(private defaultValue?: (() => Promise<string>) | (() => string) | string) {
    super();
  }

  async process(requestDetails: RequestDetails<IdLayersRequirements>) {
    let defaultValue = '';

    if (!requestDetails.id) {
      if (typeof this.defaultValue === 'function') {
        defaultValue = await this.defaultValue();
      }
      if (typeof this.defaultValue === 'string') {
        defaultValue = this.defaultValue;
      }
      if (!defaultValue) {
        defaultValue = 'unidentified';
      }
    }

    return {
      proceed: true,
      key: requestDetails.id || defaultValue,
    };
  }
}
