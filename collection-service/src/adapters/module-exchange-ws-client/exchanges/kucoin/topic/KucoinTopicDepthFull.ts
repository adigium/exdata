import { DepthFullSpecification } from '../../../base';
import { Topic, Websocket } from '../../../types';
import { Kucoin } from '../definitions';

export class KucoinTopicDepthFull implements DepthFullSpecification<Kucoin.Websocket.Messages> {
  public isUpdateIntersecting: boolean = true;
  public isUpdateOrderLoose: boolean = true;

  public mapDepthData(data: Kucoin.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[] {
    const update = data?.data;

    return [
      {
        asks: update?.changes.asks as unknown as [[string, string]],
        bids: update?.changes.bids as unknown as [[string, string]],
        finalUpdateId: update?.sequenceEnd,
        startUpdateId: update?.sequenceStart,
        timestamp: update?.time,
        symbolInner: update?.symbol,
      },
    ];
  }

  public getDepthSubjects(data: Kucoin.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): string[] | undefined {
    const symbol = 'timestamp' in data.data ? data?.topic?.split(':')[1] : data?.data?.symbol;
    return symbol ? [symbol] : undefined;
  }
}
