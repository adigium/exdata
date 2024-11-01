import { inject, injectable, named } from 'inversify';
import { Asset, ExchangeAsset, ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput } from '@modules';
import { CurrenciesResponse, DepositWithdrawalFeesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type MexcCurrencyResponse = {
  coin: string;
  Name: string;
  networkList: MexcCurrencyNetwork[];
};

type MexcCurrencyNetwork = {
  coin: string;
  depositDesc: string;
  depositEnable: boolean;
  minConfirm: number;
  Name: string;
  network: string;
  withdrawEnable: boolean;
  withdrawFee: string;
  withdrawIntegerMultiple: null;
  withdrawMax: string;
  withdrawMin: string;
  sameAddress: boolean;
  contract: string;
  withdrawTips: string;
  depositTips: string;
  netWork: string;
};

@injectable()
export class MexcMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Mexc;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Mexc)
  protected client!: ExchangeClientModule<any>;

  override mapCurrencies(
    currencies: CurrenciesResponse<MexcCurrencyResponse, MexcCurrencyNetwork>,
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
    fees: DepositWithdrawalFeesResponse<MexcCurrencyResponse>,
  ): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.entries(fees).reduce((acc, [assetUnified, assetFees]) => {
      Object.entries(assetFees.networks).forEach(([, networkFees], index) => {
        const original: MexcCurrencyNetwork | undefined = assetFees.info.networkList[index];

        const networkId = this.mapNetworkId(original.netWork);

        const name = original?.Name ?? original.netWork;

        const networkEntity: Network = {
          _id: networkId,
          name,
        };

        const assetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, assetUnified, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, assetUnified),
          networkId,
          networkInnerId: original?.netWork,
          exchangeId: this.exchangeId,
          confirmations: +original.minConfirm,
          depositFee: networkFees.deposit.fee,
          depositFeePercentage: networkFees.deposit.percentage,
          depositEnabled: original.depositEnable,
          depositMin: undefined,
          depositMax: undefined,
          withdrawalFee: networkFees.withdraw.fee,
          withdrawalFeePercentage: networkFees.withdraw.percentage,
          withdrawalEnabled: original.withdrawEnable,
          withdrawalMax: original.withdrawMax,
          withdrawalMin: original.withdrawMin,
          isDefault: undefined,
          isMemoRequired: original.sameAddress,
        };

        networks.push(networkEntity);
        exchangeAssetNetworks.push(assetNetwork);
      });
      return acc;
    });

    return { networks, exchangeAssetNetworks };
  }
}
