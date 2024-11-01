import { HttpClientModule, HttpRequest, HttpResponse } from '@modules';

interface ConstructorProps {
  baseUrl?: string;
}

export abstract class BaseHttpClient implements HttpClientModule {
  protected baseUrl: string | undefined;

  constructor({ baseUrl }: ConstructorProps) {
    this.baseUrl = baseUrl;
  }

  abstract get<Data>(request: HttpRequest<never>): Promise<HttpResponse<Data>>;

  abstract post<Body, Data>(request: HttpRequest<Body>): Promise<HttpResponse<Data>>;
}
