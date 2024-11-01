import { DepthLightSpecification } from '../../../base';
import { Topic, Websocket } from '../../../types';
import { Mexc } from '../definitions';

export class MexcTopicDepthLight implements DepthLightSpecification<Mexc.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Mexc.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): Topic.Unified.Depth[] {
    const {
      d: { asks: dataAsks, bids: dataBids, r: updateId },
      s: symbolInner,
      t: timestamp,
    } = data;

    return [
      {
        timestamp,
        finalUpdateId: +updateId,
        startUpdateId: +updateId - 1,
        symbolInner,
        asks: dataAsks.map((ask) => [ask.p, ask.v]),
        bids: dataBids.map((ask) => [ask.p, ask.v]),
        isSnapshot: true,
      },
    ];
  }

  public getDepthSubjects(data: Mexc.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): string[] | undefined {
    const symbol = data.s;
    return symbol ? [symbol] : undefined;
  }
}
