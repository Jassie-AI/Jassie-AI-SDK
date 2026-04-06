import type { ImageGenerateParams, ImageResponse } from '../types.js';

export interface ImageClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
}

export class Image {
  private client: ImageClient;

  constructor(client: ImageClient) {
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
