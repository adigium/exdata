import { DepthFullSpecification } from '../../../base';
import { Topic, Websocket } from '../../../types';
import { Poloniex } from '../definitions';

export class PoloniexTopicDepthFull implements DepthFullSpecification<Poloniex.Websocket.Messages> {
  public isUpdateIntersecting: boolean = true;
  public isUpdateOrderLoose: boolean = true;

  public mapDepthData(data: Poloniex.Websocket.Messages[Websocket.Topic.DEPTH_FULL]): Topic.Unified.Depth[] {
    return (
      data?.data?.map((update) => ({
        asks: update.asks as unknown as [[string, string]],
        bids: update.bids as unknown as [[string, string]],
        finalUpdateId: update.id,
        startUpdateId: update.id - 1,
        timestamp: update.ts,
        symbolInner: update.symbol,
        isSnapshot: false,
      })) || []
    );
  }

  public getDepthSubjects(
    data: Poloniex.Websocket.Messages[Websocket.Topic.DEPTH_FULL],
  ): string[] | undefined {
    return data?.data?.map((update) => update.symbol.toLowerCase()) || [];
  }
}
