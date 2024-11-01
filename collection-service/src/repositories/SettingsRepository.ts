import { Emitter } from 'strict-event-emitter';
import { Settings } from '@entities';

export type SettingsRepositoryEvents = {
  ['on-change']: [args: { changes: Partial<Settings>; full: Settings }];
  ['on-prop-change']: [args: { property: string; value: any; full: Settings }];
};

export interface SettingsRepository extends Emitter<SettingsRepositoryEvents> {
  connect(): Promise<Failable>;
  disconnect(): Promise<Failable>;

  isHealthy(): Promise<Failable<boolean>>;

  initialize(): Promise<Failable>;

  watch(): void;
  unwatch(): void;

  current(): Promise<Settings>;
}
