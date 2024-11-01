import { inject, injectable, named } from 'inversify';
import { ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput } from '@modules';
import { CurrenciesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type PoloniexCurrencyResponse = {
  id: number;
  name: string;
  description: string;
  type: string;
  withdrawalFee: string;
  minConf: number;
  depositAddress: null | string;
  blockchain: string;
  delisted: boolean;
  tradingState: string;
  walletState: string;
  walletDepositState: string;
  walletWithdrawalState: string;
  parentChain: null | string;
  isMultiChain: boolean;
  isChildChain: boolean;
  supportCollateral: boolean;
  supportBorrow: boolean;
  childChains: string[];
};

@injectable()
export class PoloniexMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Poloniex;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Poloniex)
  protected client!: ExchangeClientModule<any>;

  public mapCurrenciesNetworks(
    currencies: CurrenciesResponse<PoloniexCurrencyResponse[], PoloniexCurrencyResponse>,
  ): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.values(currencies).forEach((currency) => {
      Object.entries(currency.networks).forEach(([network, networkObject]) => {
        const original = networkObject.info;

        const networkId = this.mapNetworkId(network);

        const assetNetwork: Network = {
          _id: networkId,
          name: networkObject.name,
        };

        const exchangeAssetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, currency.code, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
          networkId,
          networkInnerId: original.blockchain,
          exchangeId: this.exchangeId,
          confirmations: original.minConf,
          depositFee: undefined,
          depositFeePercentage: undefined,
          depositEnabled: networkObject.deposit,
          depositMax: undefined,
          depositMin: undefined,
          withdrawalFee: networkObject.fee,
          withdrawalFeePercentage: undefined,
          withdrawalEnabled: networkObject.withdraw,
          withdrawalMax: undefined,
          withdrawalMin: undefined,
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
