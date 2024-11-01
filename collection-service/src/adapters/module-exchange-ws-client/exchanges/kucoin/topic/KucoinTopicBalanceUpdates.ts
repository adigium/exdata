import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Kucoin } from '../definitions';

export class KucoinTopicBalanceUpdates implements BalanceUpdatesSpecification<Kucoin.Websocket.Messages> {
  public mapBalanceData(
    data: Kucoin.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { data: balance } = data;

    return [
      {
        accountType: 'spot',
        assetInner: balance.currency,
        free: balance.available,
        used: balance.hold,
        total: balance.total,
        timestamp: Number(balance.time),
        isSnapshot: true,
      },
    ];
  }
}
