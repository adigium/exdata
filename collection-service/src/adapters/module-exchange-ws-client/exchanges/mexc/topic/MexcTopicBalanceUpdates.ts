import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Mexc } from '../definitions';

export class MexcTopicBalanceUpdates implements BalanceUpdatesSpecification<Mexc.Websocket.Messages> {
  public mapBalanceData(
    data: Mexc.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { d: balance, t: timestamp } = data;

    return [
      {
        accountType: 'spot',
        assetInner: balance.a,
        free: balance.f,
        used: balance.l,
        total: (Number(balance.f) + Number(balance.l)).toString(),
        timestamp,
        isSnapshot: true,
      },
    ];
  }
}
