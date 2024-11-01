import { DepthFullSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Gate } from '../definitions';

export class GateTopicDepthFull implements DepthFullSpecification<Gate.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Gate.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[] {
    const {
      t: timestamp,
      s: symbolInner,
      u: finalUpdateId,
      U: startUpdateId,
      a: asks,
      b: bids,
    } = data.result;

    return [
      {
        timestamp,
        finalUpdateId,
        startUpdateId,
        symbolInner,
        asks,
        bids,
      },
    ];
  }

  public getDepthSubjects(data: Gate.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): string[] | undefined {
    return data?.result?.s ? [data.result.s] : undefined;
  }
}
