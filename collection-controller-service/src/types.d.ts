type Failable<T = undefined> = T extends undefined
  ? {
      success: boolean;
      error?: any;
    }
  : {
      success: boolean;
      data: T | null;
      error?: any;
    };

type RequestDetails<T = unknown> = T & {};

type FunctionWithDetails<Func extends (...args: any) => any, RequiredProps> = {
  (...args: Parameters<Func>): ReturnType<Func>;
  details: RequestDetails<RequiredProps>[];
};

declare namespace Exchange {
  /*********************************************************************************************************
   * Method: exchange.fetchCurrencies()
   *********************************************************************************************************/

  export type CurrenciesResponse = {
    [currency: string]: Currency;
  };

  export type Currency = {
    id: string; // string literal for referencing within an exchange
    code: string; // uppercase unified string literal code the currency
    name: string; // string, human-readable name, if specified
    active: boolean; // boolean, currency status (tradeable and withdrawable)
    fee: number; // withdrawal fee, flat
    fees?: {
      [network: string]: number;
    };
    precision: number; // number of decimal digits "after the dot" (depends on exchange.precisionMode)
    deposit: boolean; // boolean, deposits are available
    withdraw: boolean; // boolean, withdraws are available
    //   limits: {
    // value limits when placing orders on this market
    // amount: {
    //   min?: 0.01; // order amount should be > min
    //   max?: 1000; // order amount should be < max
    // };
    // 'withdraw': { ... }, // withdrawal limits
    // 'deposit': {...},
    //   };
    //   networks: {
    //     [network: string]: Network;
    //   }; // network structures indexed by unified network identifiers (ERC20, TRC20, BSC, etc)
    info: any; // the original unparsed currency info from the exchange
  };

  export type Network = {
    id: string; // string literal for referencing within an exchange
    network: string; // unified network
    name: string; // string, human-readable name, if specified
    active: boolean; // boolean, currency status (tradeable and withdrawable)
    fee: number; // withdrawal fee, flat
    precision: number; // number of decimal digits "after the dot" (depends on exchange.precisionMode)
    deposit: boolean; // boolean, deposits are available
    withdraw: boolean; // boolean, withdraws are available
    limits: {
      // value limits when placing orders on this market
      amount?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      };
      withdraw: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      }; // withdrawal limits
      deposit: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      }; // deposit limits
    };
    info: any; // the original unparsed currency info from the exchange
  };

  /*********************************************************************************************************
   * Method: exchange.fetchMarkets()
   *********************************************************************************************************/

  export type MarketsResponse = Market[];

  export type Market = {
    id: string; // string literal for referencing within an exchange
    symbol: string; // uppercase string literal of a pair of currencies
    base: string; // uppercase string, unified base currency code, 3 or more letters
    quote: string; // uppercase string, unified quote currency code, 3 or more letters
    baseId: string; // any string, exchange-specific base currency id
    quoteId: string; // any string, exchange-specific quote currency id
    active: boolean; // boolean, market status
    type: 'future' | 'option' | 'spot' | 'swap'; // spot for spot, future for expiry futures, swap for perpetual swaps, 'option' for options
    spot: boolean; // whether the market is a spot market
    margin: boolean; // whether the market is a margin market
    future: boolean; // whether the market is a expiring future
    swap: boolean; // whether the market is a perpetual swap
    option: boolean; // whether the market is an option contract
    contract: boolean; // whether the market is a future, a perpetual swap, or an option
    settle: string; // the unified currency code that the contract will settle in, only set if `contract` is true
    settleId: string; // the currencyId of that the contract will settle in, only set if `contract` is true
    contractSize: number; // the size of one contract, only used if `contract` is true
    linear: boolean; // the contract is a linear contract (settled in quote currency)
    inverse: boolean; // the contract is an inverse contract (settled in base currency)
    expiry: number; // the unix expiry timestamp in milliseconds, undefined for everything except market['type'] `future`
    expiryDatetime: string; // The datetime contract will in iso8601 format
    strike: number; // price at which a put or call option can be exercised
    optionType: string; // call or put string, call option represents an option with the right to buy and put an option with the right to sell
    taker: number; // taker fee rate, 0.002 = 0.2%
    maker: number; // maker fee rate, 0.0016 = 0.16%
    percentage: boolean; // whether the taker and maker fee rate is a multiplier or a fixed flat amount
    tierBased: boolean; // whether the fee depends on your trading tier (your trading volume)
    feeSide: 'base' | 'get' | 'give' | 'other' | 'quote'; // string literal can be 'get', 'give', 'base', 'quote', 'other'
    precision: {
      // number of decimal digits "after the dot"
      price: number; // integer or float for TICK_SIZE roundingMode, might be missing if not supplied by the exchange
      amount: number; // integer, might be missing if not supplied by the exchange
      base?: number;
      quote?: number;
      cost?: number; // integer, very few exchanges actually have it
    };
    limits: {
      amount?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      };
      price?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      }; // same min/max limits for the price of the order
      cost?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      }; // same limits for order cost = price * amount
      leverage?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      }; // same min/max limits for the leverage of the order
      market?: {
        min?: number; // order amount should be > min
        max?: number; // order amount should be < max
      };
    };
    info: any; // the original unparsed market info from the exchange
  };

  /*********************************************************************************************************
   * Method: exchange.fetchOrderBook()
   *********************************************************************************************************/

  export type OrderBookResponse = {
    bids: [price: number, amount: number][];
    asks: [price: number, amount: number][];
    symbol: string; // a unified market symbol
    timestamp?: number; // Unix Timestamp in milliseconds (seconds * 1000)
    datetime?: string; // ISO8601 datetime string with milliseconds
    nonce: number; // an increasing unique identifier of the orderbook snapshot
  };

  /*********************************************************************************************************
   * Method: exchange.fetchBalance()
   *********************************************************************************************************/

  export type BalanceResponse = {
    info: any; // the original untouched non-parsed reply with details
    timestamp: number; // Unix Timestamp in milliseconds (seconds * 1000)
    datetime: string; // ISO8601 datetime string with milliseconds

    //-------------------------------------------------------------------------
    // indexed by availability of funds first, then by currency

    free: FreeBalanceResponse;

    used: UsedBalanceResponse; // money on hold, locked, frozen, or pending, by currency

    total: TotalBalanceResponse; // total (free + used), by currency

    //-------------------------------------------------------------------------
    // indexed by currency first, then by availability of funds
  };

  /*********************************************************************************************************
   * Method: exchange.fetchFreeBalance()
   *********************************************************************************************************/

  export type FreeBalanceResponse = Record<string, number>;

  /*********************************************************************************************************
   * Method: exchange.fetchUsedBalance()
   *********************************************************************************************************/

  export type UsedBalanceResponse = Record<string, number>;

  /*********************************************************************************************************
   * Method: exchange.fetchTotalBalance()
   *********************************************************************************************************/

  export type TotalBalanceResponse = Record<string, number>;

  /*********************************************************************************************************
   * Method: exchange.fetchDepositWithdrawalFees()
   *********************************************************************************************************/

  export type DepositWithdrawalFee = {
    withdraw: { fee?: number; percentage?: boolean };
    deposit: { fee?: number; percentage?: boolean };
    networks: {
      [network: string]: {
        deposit: { fee?: number; percentage?: boolean };
        withdraw: { fee?: number; percentage?: boolean };
      };
    };
    info: any;
  };

  export type DepositWithdrawalFeesResponse = {
    [currency: string]: DepositWithdrawalFee;
  };

  /*********************************************************************************************************
   * Method: exchange.fetchTradingFees()
   *********************************************************************************************************/

  export type TradingFeesResponse = {
    [symbol: string]: TradingFee;
  };

  export type TradingFee = {
    maker: number;
    taker: number;
    info: any;
    symbol: string;
  };
}
