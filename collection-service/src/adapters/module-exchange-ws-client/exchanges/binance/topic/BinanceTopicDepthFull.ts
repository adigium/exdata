import { DepthFullSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Binance } from '../definitions';

export class BinanceTopicDepthFull implements DepthFullSpecification<Binance.Websocket.Messages> {
  public isUpdateIntersecting: boolean = false;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Binance.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[] {
    const [symbol] = data?.stream.split('@') || [];

    if (!symbol) return [];

    const { E: timestamp, s: symbolInner, u: finalUpdateId, U: startUpdateId, a: asks, b: bids } = data.data;

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

  public getDepthSubjects(
    data: Binance.Websocket.Messages[Websocket.Topic.DEPTH_FULL],
  ): string[] | undefined {
    const symbol = 's' in data.data ? data?.data?.s : data?.stream.split('@')[0];
    return symbol ? [symbol] : undefined;
  }
}
