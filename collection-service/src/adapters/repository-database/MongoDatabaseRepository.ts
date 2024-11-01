import { inject, injectable } from 'inversify';
import mongoose, { mongo, MongooseBulkWritePerWriteOptions } from 'mongoose';
import { Asset, ExchangeAsset, ExchangeAssetNetwork, Market, Network, OrderBook } from '@entities';
import { DatabaseRepository } from '@repositories';
import {
  AssetModel,
  connectDatabase,
  disconnectDatabase,
  ExchangeAssetBalanceModel,
  ExchangeAssetModel,
  ExchangeAssetNetworkModel,
  MarketModel,
  NetworkModel,
  OrderBookModel,
} from '@frameworks/mongodb';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

@injectable()
export class MongoDatabaseRepository implements DatabaseRepository {
  @inject(DI.ConfigurationService)
  private configuration!: ConfigurationService;

  /******************************************************************************************
   *  Connection Management
   ******************************************************************************************/

  async connect() {
    return { success: await connectDatabase(this.configuration.DATABASE_URI) };
  }

  async disconnect() {
    return { success: await disconnectDatabase() };
  }

  async isHealthy() {
    return { success: true, data: mongoose.connection.readyState === 1 };
  }

  /******************************************************************************************
   *  Saving/Updating Methods
   ******************************************************************************************/

  async saveAssets(assets: ({ _id: string } & Partial<Asset>)[], upsert: boolean = true): Promise<Failable> {
    const bulkOps = assets.reduce(
      (acc, asset) => {
        if (!asset._id || !asset.symbolUnified) return acc;

        acc.push({
          updateOne: {
            filter: { _id: asset._id },
            update: { $set: asset },
            upsert,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0) return { success: false, error: 'No bulk options were written for assets' };

    try {
      const result = await AssetModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveExchangeAssets(exchangeAssets: ({ _id: string } & Partial<ExchangeAsset>)[]): Promise<Failable> {
    const bulkOps = exchangeAssets.reduce(
      (acc, exchangeAsset) => {
        if (
          exchangeAsset._id === undefined ||
          exchangeAsset.assetInnerId === undefined ||
          exchangeAsset.assetId === undefined ||
          exchangeAsset.active === undefined ||
          exchangeAsset.exchangeId === undefined ||
          exchangeAsset.deposit === undefined ||
          exchangeAsset.withdraw === undefined
        )
          return acc;

        acc.push({
          updateOne: {
            filter: { _id: exchangeAsset._id },
            update: { $set: exchangeAsset },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0) return { success: false, error: 'No bulk options were written' };

    try {
      const result = await ExchangeAssetModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveExchangeAssetBalances(
    exchangeAssetBalances: ({ _id: string } & Partial<ExchangeAssetNetwork>)[],
  ): Promise<Failable> {
    const bulkOps = exchangeAssetBalances.reduce(
      (acc, exchangeAssetBalance) => {
        if (!exchangeAssetBalance._id) return acc;

        acc.push({
          updateOne: {
            filter: { _id: exchangeAssetBalance._id },
            update: { $set: exchangeAssetBalance },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0)
      return { success: false, error: 'No bulk options were written exchange assets' };

    try {
      const result = await ExchangeAssetBalanceModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveExchangeAssetNetworks(
    exchangeAssetNetworks: ({ _id: string } & Partial<ExchangeAssetNetwork>)[],
  ): Promise<Failable> {
    const bulkOps = exchangeAssetNetworks.reduce(
      (acc, exchangeAssetNetwork) => {
        if (!exchangeAssetNetwork._id) return acc;

        acc.push({
          updateOne: {
            filter: { _id: exchangeAssetNetwork._id },
            update: { $set: exchangeAssetNetwork },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0)
      return { success: false, error: 'No bulk options were written exchange assets' };

    try {
      const result = await ExchangeAssetNetworkModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveNetworks(networks: ({ _id: string } & Partial<Network>)[]): Promise<Failable> {
    const bulkOps = networks.reduce(
      (acc, network) => {
        if (!network._id || !network.name) return acc;

        acc.push({
          updateOne: {
            filter: { _id: network._id },
            update: { $set: network },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0) return { success: false, error: 'No bulk options were written for networks' };

    try {
      const result = await NetworkModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveMarkets(markets: ({ _id: string } & Partial<Market>)[]): Promise<Failable> {
    const bulkOps = markets.reduce(
      (acc, market) => {
        if (!market._id) return acc;

        acc.push({
          updateOne: {
            filter: { _id: market._id },
            update: { $set: market },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0) return { success: false, error: 'No bulk options were written for markets' };

    try {
      const result = await MarketModel.bulkWrite(bulkOps, {
        ordered: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveOrderBooks(orderBooks: ({ _id: string } & Partial<OrderBook>)[]): Promise<Failable> {
    const bulkOps = orderBooks.reduce(
      (acc, orderBook) => {
        if (
          orderBook.asks === undefined ||
          orderBook.bids === undefined ||
          orderBook.exchangeId === undefined ||
          orderBook._id === undefined ||
          orderBook.nonce === undefined ||
          orderBook.symbolUnified === undefined
        )
          return acc;

        acc.push({
          updateOne: {
            filter: { _id: orderBook._id },
            update: { $set: orderBook },
            upsert: true,
          },
        });

        return acc;
      },
      [] as (mongo.AnyBulkWriteOperation<any> & MongooseBulkWritePerWriteOptions)[],
    );

    if (bulkOps.length === 0) return { success: false, error: 'No bulk options were written order books' };

    try {
      const result = await OrderBookModel.collection.bulkWrite(bulkOps, {
        ordered: false,
        bypassDocumentValidation: true,
        enableUtf8Validation: false,
        checkKeys: false,
      });
      return { success: result.ok === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveOrderBook(_id: string, orderBook: OrderBook): Promise<Failable> {
    try {
      const result = await OrderBookModel.updateOne({ _id }, { $set: orderBook }, { upsert: true })
        .lean()
        .exec();

      return { success: result.modifiedCount === 1 || result.upsertedCount === 1 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteOrderBooks(ids: string[]): Promise<Failable> {
    try {
      const result = await OrderBookModel.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0)
        return { success: false, error: 'No records were deleted by applying filter' };

      return { success: result.deletedCount !== 0 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /******************************************************************************************
   *  Query Methods
   ******************************************************************************************/

  async getAssets(): Promise<Failable<Asset[]>> {
    try {
      const data = await AssetModel.find().lean().exec();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getMarketsActiveInnerSymbols(exchange: string): Promise<Failable<string[]>> {
    try {
      const activeAssetIds = await AssetModel.find({
        active: true,
        $or: [{ banned: false }, { banned: null }],
      })
        .select('_id')
        .lean();
      const activeIds = activeAssetIds.map((asset) => asset._id);

      const exchangeAssets = await ExchangeAssetModel.find({
        assetId: { $in: activeIds },
        exchangeId: exchange,
        active: true,
      })
        .select('_id')
        .lean();
      const exchangeAssetIds = exchangeAssets.map((exchangeAsset) => exchangeAsset._id);

      const markets = await MarketModel.find({
        exchangeId: exchange,
        baseExchangeAssetId: { $in: exchangeAssetIds },
        quoteExchangeAssetId: { $in: exchangeAssetIds },
        active: true,
      })
        .select('symbolInner')
        .lean()
        .exec();

      return { success: true, data: markets.map((market) => market.symbolInner) };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getMarketSymbolsBySymbolsInner(
    exchange: string,
    symbolsInner: string[],
  ): Promise<Failable<Pick<Market, '_id' | 'symbolInner' | 'symbolUnified'>[]>> {
    try {
      const data = await MarketModel.find({
        exchangeId: exchange,
        symbolInner: { $in: symbolsInner },
      })
        .select('_id id symbolInner symbolUnified')
        .lean()
        .exec();

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getMarketSymbolsBySymbolInner(
    exchange: string,
    symbolInner: string,
  ): Promise<Failable<Pick<Market, '_id' | 'symbolInner' | 'symbolUnified'>>> {
    try {
      const data = await MarketModel.findOne({
        exchangeId: exchange,
        symbolInner,
      })
        .select('_id id symbolInner symbolUnified')
        .lean()
        .exec();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getOrderBook(exchange: string, symbol: string): Promise<Failable<OrderBook>> {
    try {
      const data = await OrderBookModel.findOne({
        exchangeId: exchange,
        symbolUnified: symbol,
      })
        .lean()
        .exec();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }
}
