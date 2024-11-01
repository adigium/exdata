type RequestDetails<T = unknown> = T & {};

type FunctionWithDetails<Func extends (...args: any) => any, RequiredProps> = {
  (...args: Parameters<Func>): ReturnType<Func>;
  details: RequestDetails<RequiredProps>[];
};

type WeightLayersRequirements = {
  weight: number;
};
type EndpointLayersRequirements = {
  endpoint: string;
};
type IdLayersRequirements = {
  id?: string;
};
type IpLayersRequirements = {
  ip?: string;
};

declare namespace ExchangeRequestContext {
  type Binance = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements & { isOrder?: boolean };

  type Bybit = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements;

  type Gate<TypeEnum, MethodEnum> = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements & { type: TypeEnum } & { method?: MethodEnum };

  type Kucoin<TypeEnum> = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements & { type: TypeEnum };

  type Mexc = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements;

  type Poloniex<TypeEnum> = EndpointLayersRequirements &
    WeightLayersRequirements &
    IpLayersRequirements &
    IdLayersRequirements & { type: TypeEnum };
}
