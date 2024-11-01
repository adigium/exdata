import { injectable } from 'inversify';
import _ from 'lodash';
import mongoose from 'mongoose';
import { Emitter } from 'strict-event-emitter';
import { Settings } from '@entities';
import { SettingsRepository, SettingsRepositoryEvents } from '@repositories';
import { disconnectDatabase, SettingsModel } from '@frameworks/mongodb';

const DEFAULT_UPDATE_INTERVAL_MS = 5000;

@injectable()
export class MongoSettingsRepository extends Emitter<SettingsRepositoryEvents> implements SettingsRepository {
  public settings: Settings | null;

  private interval: NodeJS.Timeout | undefined;

  constructor() {
    super();

    this.settings = null;
  }

  /******************************************************************************************
   *  Connection Management
   ******************************************************************************************/

  async connect() {
    return { success: true };
  }

  async disconnect() {
    return { success: await disconnectDatabase() };
  }

  async isHealthy() {
    return { success: true, data: mongoose.connection.readyState === 1 };
  }

  async initialize(): Promise<Failable> {
    try {
      this.settings = await this.getSettings();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // TODO: Switch to change streams
  async watch() {
    const checkSettings = (async () => {
      if (!this.interval) return;

      const settingsNew = await this.getSettings();
      const settingsOld = this.settings || {};

      if (!settingsNew) {
        this.interval = setTimeout(checkSettings, DEFAULT_UPDATE_INTERVAL_MS);
        return;
      }

      const changes = _.omitBy(settingsNew, (v, k) => settingsOld[k] === v);

      if (Object.keys(changes).length === 0) {
        this.interval = setTimeout(checkSettings, DEFAULT_UPDATE_INTERVAL_MS);
        return;
      }

      this.settings = { ...settingsNew };

      this.emit('on-change', { changes, full: settingsNew });

      for (const key of Object.keys(changes)) {
        this.emit('on-prop-change', { property: key, value: changes[key], full: settingsNew });
      }

      this.interval = setTimeout(checkSettings, DEFAULT_UPDATE_INTERVAL_MS);
    }).bind(this);

    this.interval = setTimeout(checkSettings, DEFAULT_UPDATE_INTERVAL_MS);
  }

  async unwatch() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }

  async current(): Promise<Settings> {
    if (!this.settings) this.settings = await this.getSettings();

    if (!this.settings) throw new Error('Settings unavailable');

    return this.settings;
  }

  async getSettings() {
    return SettingsModel.findOne().lean();
  }
}
