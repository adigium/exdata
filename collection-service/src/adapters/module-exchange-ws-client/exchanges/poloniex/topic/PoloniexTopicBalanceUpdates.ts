import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Poloniex } from '../definitions';

export class PoloniexTopicBalanceUpdates implements BalanceUpdatesSpecification<Poloniex.Websocket.Messages> {
  public mapBalanceData(
    data: Poloniex.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { data: balances } = data;

    return balances.map((balance) => ({
      accountType: balance.accountType,
      assetInner: balance.currency,
      free: balance.available,
      used: balance.hold,
      total: (Number(balance.available) + Number(balance.hold)).toString(),
      timestamp: balance.ts,
      isSnapshot: true,
    }));
  }
}
