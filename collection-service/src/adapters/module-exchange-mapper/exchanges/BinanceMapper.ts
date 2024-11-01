import { inject, injectable, named } from 'inversify';
import { Asset, ExchangeAsset, ExchangeAssetNetwork, ExchangeID, Network } from '@entities';
import { ExchangeClientModule, MapperOutput } from '@modules';
import { CurrenciesResponse, DepositWithdrawalFeesResponse } from '@adapters/module-exchange-client/types';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { BaseExchangeMapper } from '../BaseExchangeMapper';

type BinanceCurrencyResponse = {
  coin: string;
  depositAllEnable: boolean;
  withdrawAllEnable: boolean;
  name: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoing: string;
  ipoable: string;
  storage: string;
  isLegalMoney: boolean;
  trading: boolean;
  networkList: BinanceCurrencyNetwork[];
};

type BinanceCurrencyNetwork = {
  network: string;
  coin: string;
  withdrawIntegerMultiple: string;
  isDefault: boolean;
  depositEnable: boolean;
  withdrawEnable: boolean;
  depositDesc: string;
  depositDust?: string;
  withdrawDesc: string;
  specialTips: string;
  specialWithdrawTips: string;
  name: string;
  resetAddressStatus: boolean;
  addressRegex: string;
  memoRegex?: string;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  minConfirm: string;
  unLockConfirm: string;
  sameAddress: boolean;
  estimatedArrivalTime: string;
  busy: boolean;
  contractAddressUrl: string;
  contractAddress: string;
};

const MILLISECONDS_IN_MINUTE = 60 * 1000;

@injectable()
export class BinanceMapper extends BaseExchangeMapper {
  protected exchangeId: ExchangeID = ExchangeID.Binance;

  @inject(DI.ExchangeClientModule)
  @named(ExchangeID.Binance)
  protected client!: ExchangeClientModule<any>;

  override mapCurrencies(currencies: CurrenciesResponse<BinanceCurrencyResponse>): MapperOutput {
    const assets: Omit<Asset, 'active'>[] = [];
    const exchangeAssets: ExchangeAsset[] = [];

    Object.values(currencies).forEach((currency) => {
      const original: BinanceCurrencyResponse | undefined = currency.info;

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
        balance: original.free,
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
    fees: DepositWithdrawalFeesResponse<BinanceCurrencyResponse>,
  ): MapperOutput {
    const networks: Network[] = [];
    const exchangeAssetNetworks: ExchangeAssetNetwork[] = [];

    Object.entries(fees).reduce((acc, [assetUnified, assetFees]) => {
      if (assetFees.info.isLegalMoney) return acc;

      Object.entries(assetFees.networks).forEach(([network, networkFees], index) => {
        const original: BinanceCurrencyNetwork | undefined = assetFees.info.networkList[index];

        const networkId = this.mapNetworkId(network);

        const name = original?.name ?? network;
        const txTime = +original.estimatedArrivalTime * MILLISECONDS_IN_MINUTE;

        const networkEntity: Network = {
          _id: networkId,
          name,
          txTime: original.estimatedArrivalTime && Number.isFinite(txTime) ? txTime.toString() : undefined,
        };

        const assetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, assetUnified, networkId),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, assetUnified),
          networkId,
          networkInnerId: original?.network,
          exchangeId: this.exchangeId,
          confirmations: Math.max(+original.minConfirm, +original.unLockConfirm),
          depositFee: networkFees.deposit.fee,
          depositFeePercentage: networkFees.deposit.percentage,
          depositEnabled: original.depositEnable,
          depositMin: original.depositDust,
          depositMax: undefined,
          withdrawalFee: networkFees.withdraw.fee,
          withdrawalFeePercentage: networkFees.withdraw.percentage,
          withdrawalEnabled: original.withdrawEnable,
          withdrawalMax: original.withdrawMax,
          withdrawalMin: original.withdrawMin,
          isDefault: original.isDefault,
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
