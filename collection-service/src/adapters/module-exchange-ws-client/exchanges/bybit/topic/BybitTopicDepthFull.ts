import { DepthFullSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Bybit } from '../definitions';

export class BybitTopicDepthFull implements DepthFullSpecification<Bybit.Websocket.Messages> {
  public isUpdateIntersecting: boolean = true;
  public isUpdateOrderLoose: boolean = true;

  public mapDepthData(data: Bybit.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[] {
    const {
      data: { a, b, seq, s },
      type,
      cts,
    } = data;

    return [
      {
        asks: a,
        bids: b,
        finalUpdateId: seq,
        startUpdateId: seq - 1,
        timestamp: cts,
        symbolInner: s,
        isSnapshot: type === 'snapshot' || seq === 1,
      },
    ];
  }

  public getDepthSubjects(data: Bybit.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): string[] | undefined {
    return data.data.s ? [data.data.s] : undefined;
  }
}
