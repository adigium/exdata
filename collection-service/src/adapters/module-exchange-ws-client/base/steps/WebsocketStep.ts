import {
  ApplicationScope,
  ExchangeScope,
  WebsocketScope,
  WebsocketScoped,
} from '@adapters/module-exchange-ws-client/interfaces';
import { PipelineStep } from '@frameworks/pipeline';

export abstract class WebsocketStep<I, O> implements PipelineStep<I, O>, WebsocketScoped {
  constructor(
    public application: ApplicationScope,
    public exchange: ExchangeScope,
    public websocket: WebsocketScope,
  ) {}

  abstract execute(input: I): Promise<O>;
}
