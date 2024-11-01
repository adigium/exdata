import { DepthLightSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Gate } from '../definitions';

export class GateTopicDepthLight implements DepthLightSpecification<Gate.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Gate.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): Topic.Unified.Depth[] {
    const { asks, bids, lastUpdateId, s, t } = data.result;

    return [
      {
        asks,
        bids,
        finalUpdateId: lastUpdateId,
        startUpdateId: 0,
        timestamp: t,
        symbolInner: s,
        isSnapshot: true,
      },
    ];
  }

  public getDepthSubjects(data: Gate.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): string[] | undefined {
    return data?.result?.s ? [data.result.s] : undefined;
  }
}
