import { v4 as ipv4 } from 'public-ip';
import { IpLayersRequirements, RequestDetails } from '../types';
import { BaseLayer } from './BaseLayer';

let CACHE_IP = '';

export class IpLayer extends BaseLayer<IpLayersRequirements> {
  constructor(private defaultValue?: (() => Promise<string>) | (() => string) | string) {
    super();
  }

  async process(requestDetails: RequestDetails<IpLayersRequirements>) {
    let defaultValue = '';

    if (!requestDetails.ip) {
      if (typeof this.defaultValue === 'function') {
        defaultValue = await this.defaultValue();
      }
      if (typeof this.defaultValue === 'string') {
        defaultValue = this.defaultValue;
      }
      if (!defaultValue) {
        if (!CACHE_IP) CACHE_IP = await ipv4();
        defaultValue = CACHE_IP;
      }
    }

    return {
      proceed: true,
      key: requestDetails.ip || defaultValue,
    };
  }
}
