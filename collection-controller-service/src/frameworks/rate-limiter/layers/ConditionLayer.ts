import { LayerResult, RequestDetails } from '../types';
import { BaseLayer } from './BaseLayer';

export class ConditionLayer<T> extends BaseLayer<T> {
  constructor(private shouldProceed: (request: RequestDetails<T>) => boolean) {
    super();
  }

  async process(requestDetails: RequestDetails<T>): Promise<LayerResult> {
    const proceed = this.shouldProceed(requestDetails);

    return {
      proceed,
      key: undefined,
    };
  }
}
