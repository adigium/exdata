import { DatabaseRepository } from '@repositories';
import { MapperOutput } from '@modules';

export class SaverService {
  public static async save(database: DatabaseRepository, data: MapperOutput): Promise<Failable> {
    const { assets, exchangeAssets, exchangeAssetNetworks, networks, markets, orderBooks } = data;

    const savingResult: Failable = { success: true, error: '' };

    // TODO: Consider Promise.all for the performance reasons

    try {
      if (assets) {
        const operationResult = await database.saveAssets(assets);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
      if (networks) {
        const operationResult = await database.saveNetworks(networks);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
      if (exchangeAssets) {
        const operationResult = await database.saveExchangeAssets(exchangeAssets);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
      if (exchangeAssetNetworks) {
        const operationResult = await database.saveExchangeAssetNetworks(exchangeAssetNetworks);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
      if (markets) {
        const operationResult = await database.saveMarkets(markets);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
      if (orderBooks) {
        const operationResult = await database.saveOrderBooks(orderBooks);
        savingResult.success = savingResult.success && operationResult.success;
        if (operationResult.error) savingResult.error = `${operationResult.error}; ${savingResult.error}`;
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    return savingResult;
  }
}
