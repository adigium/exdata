import { DepthLightSpecification } from '../../../base';
import { Topic, Websocket } from '../../../types';
import { Kucoin } from '../definitions';

export class KucoinTopicDepthLight implements DepthLightSpecification<Kucoin.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Kucoin.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): Topic.Unified.Depth[] {
    const lightweightUpdate = data?.data;

    const symbol = data?.topic?.split(':')[1];

    if (!symbol) return [];

    return [
      {
        asks: lightweightUpdate.asks,
        bids: lightweightUpdate.bids,
        finalUpdateId: 0,
        startUpdateId: 0,
        timestamp: lightweightUpdate.timestamp,
        symbolInner: symbol,
        isSnapshot: true,
      },
    ];
  }

  public getDepthSubjects(
    data: Kucoin.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT],
  ): string[] | undefined {
    const symbol = data?.topic?.split(':')[1];
    return symbol ? [symbol] : undefined;
  }
}
