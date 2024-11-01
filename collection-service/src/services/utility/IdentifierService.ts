export class IdentifierService {
  public static getSymbolUnified(baseAssetUnified: string, quoteAssetUnified: string) {
    return `${baseAssetUnified.toLowerCase()}/${quoteAssetUnified.toLowerCase()}`;
  }

  public static getAssetId(assetUnified: string) {
    return assetUnified.toLowerCase();
  }

  public static getExchangeAssetId(exchange: string, assetUnified: string) {
    return `${exchange.toLowerCase()}-${assetUnified.toLowerCase()}`;
  }

  public static getExchangeAssetBalanceId(exchange: string, assetUnified: string, accountType: string) {
    return `${exchange.toLowerCase()}-${assetUnified.toLowerCase()}-${accountType.toLowerCase()}`;
  }

  public static getExchangeAssetNetworkId(exchange: string, assetUnified: string, networkUnified: string) {
    return `${exchange.toLowerCase()}-${assetUnified.toLowerCase()}-${networkUnified.toLowerCase()}`;
  }

  public static getNetworkId(networkUnified: string) {
    return networkUnified.toLowerCase();
  }

  public static getMarketId(exchange: string, symbolUnified: string) {
    return `${exchange.toLowerCase()}-${symbolUnified.toLowerCase()}`;
  }

  public static getOrderBookId(exchange: string, symbolUnified: string) {
    return `${exchange.toLowerCase()}-${symbolUnified.toLowerCase()}`;
  }
}
