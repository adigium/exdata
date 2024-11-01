import { inject, injectable, named } from 'inversify';
import { Asset, ExchangeAsset, ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput } from '@modules';
import { CurrenciesResponse, DepositWithdrawalFeesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type BybitCurrencyResponse = {
  name: string;
  coin: string;
  remainAmount: string;
  chains: BybitCurrencyNetwork[];
};

type BybitCurrencyNetwork = {
  chainType: string;
  confirmation: string;
  withdrawFee: string;
  depositMin: string;
  withdrawMin: string;
  chain: string;
  chainDeposit: string;
  chainWithdraw: string;
  minAccuracy: string;
  withdrawPercentageFee: string;
};

@injectable()
export class BybitMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Bybit;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Bybit)
  protected client!: ExchangeClientModule<any>;

  override mapCurrencies(
    currencies: CurrenciesResponse<BybitCurrencyResponse, BybitCurrencyNetwork>,
  ): MapperOutput {
    const assets: Omit<Asset, 'active'>[] = [];
    const exchangeAssets: ExchangeAsset[] = [];

    Object.values(currencies).forEach((currency) => {
      const asset: Omit<Asset, 'active'> = {
        _id: IdentifierService.getAssetId(currency.code),
        symbolUnified: currency.code,
        name: currency.name,
      };

      const exchangeAsset: ExchangeAsset = {
        _id: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
        assetId: currency.code.toLowerCase(),
        assetInnerId: currency.id,
        exchangeId: this.exchangeId,
        active: currency.active,
        deposit: currency.deposit,
        withdraw: currency.withdraw,
        precision: currency.precision,
        balance: undefined,
      };

      assets.push(asset);
      exchangeAssets.push(exchangeAsset);
    });

    return { assets, exchangeAssets };
  }

  override mapCurrenciesNetworks(): MapperOutput {
    return {};
  }

  override mapDepositWithdrawNetworks(
    fees: DepositWithdrawalFeesResponse<BybitCurrencyResponse>,
  ): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.entries(fees).reduce((acc, [assetUnified, assetFees]) => {
      Object.entries(assetFees.networks).forEach(([network, networkFees], index) => {
        const original: BybitCurrencyNetwork | undefined = assetFees.info.chains[index];

        const networkId = this.mapNetworkId(network);

        const name = original?.chain ?? network;

        const networkEntity: Network = {
          _id: networkId,
          name,
        };

        const assetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, assetUnified, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, assetUnified),
          networkId,
          networkInnerId: original?.chain,
          exchangeId: this.exchangeId,
          confirmations: +original.confirmation,
          depositFee: networkFees.deposit.fee,
          depositFeePercentage: networkFees.deposit.percentage,
          depositEnabled: original.chainDeposit === '1',
          depositMin: original.depositMin,
          depositMax: undefined,
          withdrawalFee: networkFees.withdraw.fee,
          withdrawalFeePercentage: networkFees.withdraw.percentage,
          withdrawalEnabled: original.chainWithdraw === '1' && !!original.withdrawFee,
          withdrawalMax: undefined,
          withdrawalMin: original.withdrawMin,
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
