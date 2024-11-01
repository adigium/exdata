import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Bybit } from '../definitions';

export class BybitTopicBalanceUpdates implements BalanceUpdatesSpecification<Bybit.Websocket.Messages> {
  public mapBalanceData(
    data: Bybit.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { data: balances, creationTime } = data;

    return balances.flatMap((balance) =>
      balance.coin.map((coin) => ({
        accountType: balance.accountType,
        assetInner: coin.coin,
        free: coin.availableToWithdraw,
        used: coin.locked,
        total: (parseFloat(coin.availableToWithdraw) + parseFloat(coin.locked)).toString(),
        timestamp: creationTime,
        isSnapshot: true,
      })),
    );
  }
}
