import type { ImageGenerateParams, ImageResponse } from '../types.js';

export interface ImagesClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
}

export class Images {
  private client: ImagesClient;

  constructor(client: ImagesClient) {
    this.client = client;
  }

  /** Generate an image */
  async generate(params: ImageGenerateParams): Promise<ImageResponse> {
    return this.client._request<ImageResponse>(
      'POST',
      '/v1/generate-image',
      params,
    );
  }
}
