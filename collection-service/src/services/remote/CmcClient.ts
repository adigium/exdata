import { inject, injectable } from 'inversify';
import { HttpClientModule, LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { ConfigurationService } from '@services/core';

type AssetRank = { id: number; rank: number; name: string; symbol: string };

@injectable()
export class CmcClient {
  private logger: LoggerModule;

  constructor(
    @inject(DI.ConfigurationService) private configuration: ConfigurationService,
    @inject(DI.HttpClientModule) private httpClient: HttpClientModule,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'CmcClient');
  }

  public async getAssetsRanks() {
    try {
      const response = await this.httpClient.get<{ data?: AssetRank[] }>({
        url: `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map`,
        headers: {
          'X-CMC_PRO_API_KEY': this.configuration.COINMARKETCAP_API_KEY,
        },
      });

      if (!response.data.data) return null;

      return response.data.data;
    } catch (e: any) {
      this.logger.error(`Failed to fetch information about ranking of assets: ${e.message}`);
      return null;
    }
  }
}
