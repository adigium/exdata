import { LayerResult } from '../types';
import { BaseLayer } from './BaseLayer';

export class CountLayer extends BaseLayer<Record<string, never>> {
  override async process(): Promise<LayerResult> {
    const keyPart = 'count';

    return {
      proceed: true,
      key: keyPart,
    };
  }
}
