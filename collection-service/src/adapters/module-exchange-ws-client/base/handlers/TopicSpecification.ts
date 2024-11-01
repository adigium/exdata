import { Websocket } from '../../types';
import { BalanceUpdatesSpecification } from './BalanceUpdatesSpecification';
import { DepthFullSpecification } from './DepthFullSpecification';
import { DepthLightSpecification } from './DepthLightSpecification';

export type TopicSpecification<TWebsocketMessages extends Websocket.Exchange.Topic> = {
  [Websocket.Topic.DEPTH_FULL]: DepthFullSpecification<TWebsocketMessages>;
  [Websocket.Topic.DEPTH_LIGHT]: DepthLightSpecification<TWebsocketMessages>;
  [Websocket.Topic.BALANCE_UPDATES]: BalanceUpdatesSpecification<TWebsocketMessages>;
};
