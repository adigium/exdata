import { Websocket } from '../../types';
import { Topic } from './types';

export interface BalanceUpdatesSpecification<TWebsocketMessages extends Websocket.Exchange.Topic> {
  /** Used for mapping data into unified format for further processing */
  mapBalanceData(data: TWebsocketMessages[Websocket.Topic.BALANCE_UPDATES]): Topic.Unified.Balance[];
}
