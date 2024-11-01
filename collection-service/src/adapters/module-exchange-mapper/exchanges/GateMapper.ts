import { inject, injectable, named } from 'inversify';
import { ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput, UpdateRecord } from '@modules';
import { CurrenciesResponse, DepositWithdrawalFeesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type GateFeesResponse = {
  currency: string;
  name: string;
  name_cn: string;
  deposit: string;
  withdraw_percent: `${number}%`;
  withdraw_fix: string;
  withdraw_day_limit: string;
  withdraw_day_limit_remain: string;
  withdraw_amount_mini: string;
  withdraw_eachtime_limit: string;
  withdraw_fix_on_chains: {
    [asset: string]: string;
  };
  withdraw_percent_on_chains: {
    [asset: string]: `${number}%`;
  };
};

@injectable()
export class GateMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Gate;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Gate)
  protected client!: ExchangeClientModule<any>;

  override mapCurrenciesNetworks(currencies: CurrenciesResponse): MapperOutput {
    const exchangeAssetNetworks: UpdateRecord<ExchangeAssetNetwork>[] = Object.values(currencies).reduce(
      (acc, currency) => {
        Object.entries(currency.networks).forEach(([network, networkObject]) => {
          const networkId = this.mapNetworkId(network);

          const assetNetwork: UpdateRecord<ExchangeAssetNetwork> = {
            _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, currency.code, networkId),
            exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
            networkId,
            networkInnerId: networkObject.id,
            exchangeId: this.exchangeId,
            depositEnabled: networkObject.deposit,
            withdrawalEnabled: networkObject.withdraw,
          };

          acc.push(assetNetwork);
        });
        return acc;
      },
      [] as UpdateRecord<ExchangeAssetNetwork>[],
    );

    return { exchangeAssetNetworks };
  }

  override mapDepositWithdrawNetworks(fees: DepositWithdrawalFeesResponse<GateFeesResponse>): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.entries(fees).reduce((acc, [assetUnified, assetFees]) => {
      Object.entries(assetFees.networks).forEach(([networkInner, networkFees]) => {
        const original: GateFeesResponse | undefined = assetFees.info;

        const networkId = this.mapNetworkId(networkInner);

        const networkEntity: Network = {
          _id: networkId,
          name: networkId,
        };

        const assetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, assetUnified, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, assetUnified),
          networkId,
          networkInnerId: undefined,
          exchangeId: this.exchangeId,
          depositFee: networkFees.deposit.fee,
          depositFeePercentage: networkFees.deposit.percentage,
          depositEnabled: undefined,
          depositMin: undefined,
          depositMax: undefined,
          withdrawalFee: networkFees.withdraw.fee,
          withdrawalFeePercentage: networkFees.withdraw.percentage,
          withdrawalEnabled: undefined,
          withdrawalMax: original.withdraw_eachtime_limit,
          withdrawalMin: original.withdraw_amount_mini,
          isDefault: undefined,
          isMemoRequired: undefined,
        };

        networks.push(networkEntity);
        exchangeAssetNetworks.push(assetNetwork);
      });
      return acc;
    });

    return { networks, exchangeAssetNetworks };
  }
}
