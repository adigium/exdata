import { inject, injectable } from 'inversify';
import { Asset } from '@entities';
import { DatabaseRepository, SettingsRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';
import { DI } from '@di';
import { IdentifierService } from '@services/utility';
import { CmcClient } from './CmcClient';

@injectable()
export class CmcService {
  private logger: LoggerModule;

  constructor(
    @inject(DI.SettingsRepository) private settings: SettingsRepository,
    @inject(DI.DatabaseRepository) private database: DatabaseRepository,
    @inject(DI.CmcClient) private cmcClient: CmcClient,
  ) {
    this.logger = new Logger(new ConsoleLoggerStrategy(), 'CmcService');
  }

  public async updateRanking() {
    const { assetsRankThreshold } = await this.settings.current();

    const assetRanks = await this.cmcClient.getAssetsRanks();

    if (!assetRanks) {
      this.logger.error(`Cannot update ranks due to absence of data`);
      return;
    }

    const assetsToSave: (Pick<Asset, '_id'> & Partial<Asset>)[] = assetRanks
      .map((asset) => ({
        _id: IdentifierService.getAssetId(asset.symbol),
        symbolUnified: asset.symbol,
        index: asset.rank,
        active: asset.rank < assetsRankThreshold,
      }))
      .filter((asset) => asset.active);

    const savingResult = await this.database.saveAssets(assetsToSave, false);

    if (!savingResult.success) this.logger.error(`Failed to save assets ranks: ${savingResult.error}`);
  }
}
