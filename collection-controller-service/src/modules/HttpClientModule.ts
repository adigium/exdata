export interface HttpRequest<Body = any> {
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Body;
}

export interface HttpResponse<Data = any> {
  data: Data;
  headers: Record<string, string>;
  request: HttpRequest;
  status: number;
}

export interface HttpClientModule {
  get<Data>(request: HttpRequest<never>): Promise<HttpResponse<Data>>;
  post<Body, Data>(request: HttpRequest<Body>): Promise<HttpResponse<Data>>;
}
