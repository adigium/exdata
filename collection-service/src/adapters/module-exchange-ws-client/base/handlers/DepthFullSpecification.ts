import { Websocket } from '../../types';
import { Topic } from './types';

export interface DepthFullSpecification<TWebsocketMessages extends Websocket.Exchange.Topic> {
  /** Indicates:
   * - if "true": event.finalUpdateId === nextEvent.startUpdateId
   * - if "false": event.finalUpdateId + 1 === nextEvent.startUpdateId */
  isUpdateIntersecting: boolean;
  /** Indicates whenever the condition for processing becomes loose: event.finalUpdateId > stored.nonce */
  isUpdateOrderLoose: boolean;

  /** Used for mapping data into unified format for further processing */
  mapDepthData(data: TWebsocketMessages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[];
  /** Exctracts subjects (symbols) from the incoming data. Often it's just one subject per data message. */
  getDepthSubjects(data: TWebsocketMessages[Websocket.Topic.DEPTH_FULL]): string[] | undefined;
}
