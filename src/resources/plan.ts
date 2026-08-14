import type {
  ClientInterface,
  PlanParams,
  PlanResponse,
} from '../types.js';

export class Plan {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate an execution plan for a user query. */
  async generate(params: PlanParams): Promise<PlanResponse> {
    return this.client._request<PlanResponse>('POST', '/v1/plan', params);
  }
}
