import { DepthLightSpecification } from '../../../base';
import { Topic, Websocket } from '../../../types';
import { Poloniex } from '../definitions';

export class PoloniexTopicDepthLight implements DepthLightSpecification<Poloniex.Websocket.Messages> {
  public isUpdateIntersecting: boolean = true;
  public isUpdateOrderLoose: boolean = false;

  public mapDepthData(data: Poloniex.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT]): Topic.Unified.Depth[] {
    return (
      data?.data?.map((update) => ({
        asks: update.asks as unknown as [[string, string]],
        bids: update.bids as unknown as [[string, string]],
        finalUpdateId: update.id,
        startUpdateId: update.lastId,
        timestamp: update.ts,
        symbolInner: update.symbol,
        isSnapshot: data.action === 'snapshot',
      })) || []
    );
  }

  public getDepthSubjects(
    data: Poloniex.Websocket.Messages[Websocket.Topic.DEPTH_LIGHT],
  ): string[] | undefined {
    return data?.data?.map((update) => update.symbol.toLowerCase()) || [];
  }
}
