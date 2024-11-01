import { Websocket } from '../../types';

export interface TopicHandler<TWebsocketMessages extends Websocket.Exchange.Topic> {
  handleSubscribe(subjects: string[]): Promise<void>;
  handleUnsubscribe(subjects: string[]): Promise<void>;

  handleUpdate(message: TWebsocketMessages): Promise<void>;
}
