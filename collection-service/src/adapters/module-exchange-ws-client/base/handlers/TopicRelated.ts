import { Websocket } from '../../types';
import { TopicSpecification } from './TopicSpecification';

export interface TopicRelated<TWebsocketMessages extends Websocket.Exchange.Topic> {
  topic: Websocket.Topic;
  specification: TopicSpecification<TWebsocketMessages>[keyof TopicSpecification<TWebsocketMessages>];
}
