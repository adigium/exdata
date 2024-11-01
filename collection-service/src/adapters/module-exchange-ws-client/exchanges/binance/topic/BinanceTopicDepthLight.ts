import { DepthLightSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Binance } from '../definitions';

export class BinanceTopicDepthLight implements DepthLightSpecification<Binance.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Binance.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): Topic.Unified.Depth[] {
    const [symbol] = data?.stream.split('@') || [];

    if (!symbol) return [];

    const { asks, bids, lastUpdateId } = data.data;

    return [
      {
        asks,
        bids,
        finalUpdateId: lastUpdateId,
        startUpdateId: 0,
        timestamp: Date.now(),
        symbolInner: symbol,
        isSnapshot: true,
      },
    ];
  }

  public getDepthSubjects(
    data: Binance.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT],
  ): string[] | undefined {
    const symbol = data?.stream.split('@')[0];
    return symbol ? [symbol] : undefined;
  }
}
