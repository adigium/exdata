import { v4 as uuid } from 'uuid';
import { CollectorServiceInstance } from '@entities';
import { DatabaseRepository } from '@repositories';
import { LoggerModule } from '@modules';
import { ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

export class InstanceRegistryService {
  private database: DatabaseRepository;
  private logger: LoggerModule;

  constructor(input: { DI: { database: DatabaseRepository } }) {
    const { DI } = input;

    this.database = DI.database;

    this.logger = new Logger(new ConsoleLoggerStrategy(), 'InstanceRegistry');
  }

  async registerInstance(instance: Omit<CollectorServiceInstance, 'id'>): Promise<null | string> {
    const instanceId = this.generateUniqueId();

    const isSaved = await this.database.createCollectorServiceInstance({
      ...instance,
      id: instanceId,
      lastHeartbeat: Date.now(),
    });

    if (!isSaved) {
      this.logger.error(`Instance registration failed: ${instanceId}`);

      return null;
    }

    this.logger.info(`Instance registered: ${instanceId}`);

    return instanceId;
  }

  async deregisterInstance(id: string): Promise<boolean> {
    const isDeleted = await this.database.deleteCollectorServiceInstance(id);

    if (!isDeleted) {
      this.logger.error(`Instance deregistration failed: ${id}`);

      return false;
    }

    this.logger.info(`Instance deregistered: ${id}`);

    return true;
  }

  async receiveHeartbeat(id: string): Promise<boolean> {
    const collectorInstance = await this.database.getCollectorServiceInstance(id);

    if (!collectorInstance) {
      this.logger.error(`Received heartbeat for instance that is not registered: ${id}`);
      return false;
    }

    const isUpdated = await this.database.updateCollectorServiceInstance(id, {
      lastHeartbeat: Date.now(),
    });

    if (!isUpdated) {
      this.logger.error(`Failed to update instance's hearbeat record: ${id}`);
      return false;
    }

    // this.logger.info(`Heartbeat successfully processed: ${id}`);
    return true;
  }

  private generateUniqueId(): string {
    return uuid();
  }
}
