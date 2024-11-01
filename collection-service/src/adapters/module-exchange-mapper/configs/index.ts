import { ExchangeID } from '@entities';
import { BINANCE_NETWORK_CONFIG } from './binance';
import { BYBIT_NETWORK_CONFIG } from './bybit';
import { GATE_NETWORK_CONFIG } from './gate';
import { KUCOIN_NETWORK_CONFIG } from './kucoin';
import { MEXC_NETWORK_CONFIG } from './mexc';
import { POLONIEX_NETWORK_CONFIG } from './poloniex';

const reverseMap = (map: Record<string, string[]>) =>
  Object.entries(map).reduce(
    (acc, [key, values]) => {
      values.forEach((value) => {
        if (acc.has(value)) throw new Error('Trying to reverse map with doubled reverse key');
        acc.set(value, key);
      });
      return acc;
    },
    new Map() as Map<string, string>,
  );

export default {
  [ExchangeID.Binance]: reverseMap(BINANCE_NETWORK_CONFIG),
  [ExchangeID.Bybit]: reverseMap(BYBIT_NETWORK_CONFIG),
  [ExchangeID.Gate]: reverseMap(GATE_NETWORK_CONFIG),
  [ExchangeID.Kucoin]: reverseMap(KUCOIN_NETWORK_CONFIG),
  [ExchangeID.Mexc]: reverseMap(MEXC_NETWORK_CONFIG),
  [ExchangeID.Poloniex]: reverseMap(POLONIEX_NETWORK_CONFIG),
} as {
  [key in ExchangeID]: Map<string, string>;
};
