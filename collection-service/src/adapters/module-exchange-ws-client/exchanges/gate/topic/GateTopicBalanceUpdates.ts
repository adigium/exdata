import { BalanceUpdatesSpecification } from '../../../base/handlers';
import { Topic, Websocket } from '../../../types';
import { Gate } from '../definitions';

export class GateTopicBalanceUpdates implements BalanceUpdatesSpecification<Gate.Websocket.Messages> {
  public mapBalanceData(
    data: Gate.Websocket.Messages[Websocket.Topic.BALANCE_UPDATES],
  ): Topic.Unified.Balance[] {
    const { result, time } = data;

    return result.map((balance) => ({
      accountType: Gate.Constant.BALANCE_ACCOUNT_TYPE,
      assetInner: balance.currency,
      free: balance.available,
      used: balance.freeze,
      total: balance.total,
      timestamp: time,
      isSnapshot: true,
    }));
  }
}
