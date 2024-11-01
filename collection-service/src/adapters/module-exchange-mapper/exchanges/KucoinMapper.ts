import { inject, injectable, named } from 'inversify';
import { ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput } from '@modules';
import { CurrenciesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type KucoinNetworkResponse = {
  chainName: string;
  depositMinSize?: string;
  depositFeeRate?: string;
  depositMinFee?: string;
  isDepositEnabled: boolean;
  withdrawalMinSize: string;
  withdrawFeeRate?: string;
  withdrawalMinFee: string;
  isWithdrawEnabled: boolean;
  confirms: number;
  preConfirms: number;
  contractAddress: string;
  chainId: string;
};

@injectable()
export class KucoinMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Kucoin;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Kucoin)
  protected client!: ExchangeClientModule<any>;

  public mapCurrenciesNetworks(currencies: CurrenciesResponse<null, KucoinNetworkResponse>): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.values(currencies).forEach((currency) => {
      Object.entries(currency.networks).forEach(([network, networkObject]) => {
        const original = networkObject.info;

        if (
          (original.depositFeeRate && +original.depositFeeRate !== 0) ||
          (original.depositMinFee && +original.depositMinFee !== 0)
        )
          return;

        if (original.withdrawFeeRate && +original.withdrawFeeRate !== 0) return;

        const networkId = this.mapNetworkId(network);

        const assetNetwork: Network = {
          _id: networkId,
          name: networkObject.name,
        };

        const exchangeAssetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, currency.code, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
          networkId,
          networkInnerId: original.chainId,
          exchangeId: this.exchangeId,
          confirmations: Math.max(original.confirms, original.preConfirms),
          depositFee: undefined,
          depositFeePercentage: undefined,
          depositEnabled: networkObject.deposit,
          depositMax: undefined,
          depositMin: original.depositMinSize,
          withdrawalFee: networkObject.fee,
          withdrawalFeePercentage: false,
          withdrawalEnabled: networkObject.withdraw,
          withdrawalMax: undefined,
          withdrawalMin: original.withdrawalMinSize,
          isDefault: undefined,
          isMemoRequired: undefined,
        };

        networks.push(assetNetwork);
        exchangeAssetNetworks.push(exchangeAssetNetwork);
      });
    });

    return { networks, exchangeAssetNetworks };
  }

  override mapDepositWithdrawNetworks(): MapperOutput {
    return {};
  }
}
