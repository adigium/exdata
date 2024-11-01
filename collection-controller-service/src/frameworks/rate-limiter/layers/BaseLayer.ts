import { Layer, LayerResult, RequestDetails } from '../types';

export abstract class BaseLayer<T = unknown> implements Layer<T> {
  abstract process(requestDetails: RequestDetails<T>): Promise<LayerResult>;
}
