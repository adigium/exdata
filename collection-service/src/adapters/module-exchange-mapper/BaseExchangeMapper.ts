import {
  Asset,
  ExchangeAsset,
  ExchangeAssetBalance,
  ExchangeAssetNetwork,
  ExchangeID,
  Market,
  Network,
  OrderBook,
} from '@entities';
import { ExchangeClientModule, ExchangeMapperModule, MapperOutput } from '@modules';
import {
  BalancesResponse,
  CurrenciesResponse,
  DepositWithdrawalFeesResponse,
  MarketsResponse,
  OrderBookResponse,
} from '@adapters/module-exchange-client/types';
import { IdentifierService } from '@services/utility';
import configs from './configs';

export abstract class BaseExchangeMapper implements ExchangeMapperModule {
  protected abstract exchangeId: ExchangeID;

  protected abstract client: ExchangeClientModule<any>;

  public mapNetworkId(network: string) {
    const networkUnified = this.client.networkInnerToUnified(network).toLowerCase();
    const networkId = configs[this.exchangeId].get(networkUnified);
    return IdentifierService.getNetworkId(networkId || networkUnified || network);
  }

  public mapCurrencies(currencies: CurrenciesResponse): MapperOutput {
    const assets: Omit<Asset, 'active'>[] = Object.values(currencies).map((currency) => {
      const asset: Omit<Asset, 'active'> = {
        _id: IdentifierService.getAssetId(currency.code),
        symbolUnified: currency.code,
        name: currency.name,
      };
      return asset;
    });

    const exchangeAssets: ExchangeAsset[] = Object.values(currencies).map((currency) => {
      const asset: ExchangeAsset = {
        _id: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
        assetId: currency.code.toLowerCase(),
        assetInnerId: currency.id,
        exchangeId: this.exchangeId,
        active: currency.active,
        deposit: currency.deposit,
        withdraw: currency.withdraw,
        precision: currency.precision,
      };
      return asset;
    });

    return { assets, exchangeAssets };
  }

  public mapCurrenciesNetworks(currencies: CurrenciesResponse): MapperOutput {
    const networks: Network[] = Object.values(currencies)
      .reduce((acc, currency) => {
        if (!Array.isArray(currency.networks))
          Object.entries(currency.networks).forEach(([networkId, network]) => {
            const assetNetwork: Network = {
              _id: IdentifierService.getNetworkId(networkId),
              name: network.name,
            };

            acc.push(assetNetwork);
          });
        return acc;
      }, [] as Network[])
      .filter((v, i, a) => a.findIndex((v2) => JSON.stringify(v2) === JSON.stringify(v)) === i);

    const exchangeAssetNetworks: ExchangeAssetNetwork[] = Object.values(currencies).reduce(
      (acc, currency) => {
        Object.entries(currency.networks).forEach(([networkId, network]) => {
          const assetNetwork: ExchangeAssetNetwork = {
            _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, currency.code, networkId),
            exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, currency.code),
            networkId: IdentifierService.getNetworkId(networkId),
            networkInnerId: network.id,
            exchangeId: this.exchangeId,
            depositFee: undefined,
            depositFeePercentage: undefined,
            withdrawalFee: network.fee,
            withdrawalFeePercentage: false,
          };

          acc.push(assetNetwork);
        });
        return acc;
      },
      [] as ExchangeAssetNetwork[],
    );

    return { networks, exchangeAssetNetworks };
  }

  public mapDepositWithdrawNetworks(fees: DepositWithdrawalFeesResponse): MapperOutput {
    const networks: Network[] = Object.entries(fees)
      .reduce((acc, [, fee]) => {
        Object.entries(fee.networks).forEach(([network]) => {
          const assetNetwork: Network = {
            _id: IdentifierService.getNetworkId(network),
            name: network,
          };

          acc.push(assetNetwork);
        });
        return acc;
      }, [] as Network[])
      .filter((v, i, a) => a.findIndex((v2) => JSON.stringify(v2) === JSON.stringify(v)) === i);

    const exchangeAssetNetworks: ExchangeAssetNetwork[] = Object.entries(fees).reduce((acc, [code, fee]) => {
      Object.entries(fee.networks).forEach(([network, networkFees]) => {
        const assetNetwork: ExchangeAssetNetwork = {
          _id: IdentifierService.getExchangeAssetNetworkId(this.exchangeId, code, network),
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, code),
          exchangeId: this.exchangeId,
          networkId: IdentifierService.getNetworkId(network),
          depositFee: networkFees.deposit.fee,
          depositFeePercentage: networkFees.deposit.percentage,
          withdrawalFee: networkFees.withdraw.fee,
          withdrawalFeePercentage: networkFees.withdraw.percentage,
        };

        acc.push(assetNetwork);
      });
      return acc;
    }, [] as ExchangeAssetNetwork[]);

    return { networks, exchangeAssetNetworks };
  }

  public mapMarkets(marketsRes: MarketsResponse): MapperOutput {
    const markets: Omit<Market, 'orderBook'>[] = marketsRes
      .filter((market) => market.spot)
      .map((marketRes) => {
        const market: Omit<Market, 'orderBook'> = {
          _id: IdentifierService.getMarketId(this.exchangeId, marketRes.symbol),
          symbolInner: marketRes.id,
          exchangeId: this.exchangeId,
          symbolUnified: marketRes.symbol,
          baseExchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, marketRes.base),
          quoteExchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, marketRes.quote),
          active: marketRes.active,
          feeMaker: marketRes.maker,
          feeTaker: marketRes.taker,
          feePercentage: marketRes.percentage,
          precisionAmount: marketRes.precision.amount,
          precisionCost: marketRes.precision.cost,
          precisionPrice: marketRes.precision.price,
          precisionBase: marketRes.precision.base,
          precisionQuote: marketRes.precision.quote,
          priceMax: marketRes.limits.price?.max,
          priceMin: marketRes.limits.price?.min,
          quantityMax: marketRes.limits.amount?.max,
          quantityMin: marketRes.limits.amount?.min,
          notionalMax: marketRes.limits.cost?.max,
          notionalMin: marketRes.limits.cost?.max,
        };
        return market;
      });

    return { markets };
  }

  // TODO: Make more accurate implementation in exchange specific file
  public mapBalances(balancesRes: BalancesResponse): MapperOutput {
    const { data, timestamp } = balancesRes;

    const balances = Object.entries(data).reduce((acc, [accountType, accountBalances]) => {
      Object.entries(accountBalances).forEach(([assetUnified, balance]) => {
        const exchangeAssetBalance: ExchangeAssetBalance = {
          _id: IdentifierService.getExchangeAssetBalanceId(this.exchangeId, assetUnified, accountType),
          exchangeId: this.exchangeId,
          exchangeAssetId: IdentifierService.getExchangeAssetId(this.exchangeId, assetUnified),
          accountType,
          free: balance.free,
          used: balance.used,
          total: balance.total,
          timestamp,
        };
        acc.push(exchangeAssetBalance);
      });
      return acc;
    }, [] as ExchangeAssetBalance[]);

    return { exchangeAssetBalances: balances };
  }

  public mapOrderBooks(orderBooksRes: OrderBookResponse[]): MapperOutput {
    const orderBooks: OrderBook[] = orderBooksRes.map((orderBookRes) => ({
      ...orderBookRes,
      _id: IdentifierService.getOrderBookId(this.exchangeId, orderBookRes.symbol),
      exchangeId: this.exchangeId,
      symbolUnified: orderBookRes.symbol,
      symbolInner: undefined,
      timestamp: orderBookRes.timestamp || Date.now(),
      latency: 0,
      synchronizedAt: 0,
    }));

    return { orderBooks };
  }
}
