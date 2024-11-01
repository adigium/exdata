import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Binance } from '../definitions';

export class BinanceTopicBalanceUpdates implements BalanceUpdatesSpecification<Binance.Websocket.Messages> {
  public mapBalanceData(
    data: Binance.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { B: balances, E: eventTime } = data;

    return balances.map((balance) => ({
      accountType: Binance.Constant.BALANCE_ACCOUNT_TYPE,
      assetInner: balance.a,
      free: balance.f,
      used: balance.l,
      total: (parseFloat(balance.f) + parseFloat(balance.l)).toString(),
      timestamp: eventTime,
      isSnapshot: true,
    }));
  }
}
