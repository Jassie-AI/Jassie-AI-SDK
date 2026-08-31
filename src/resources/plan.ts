import type {
  ClientInterface,
  PlanParams,
  PlanResponse,
  HierarchicalPlanParams,
  HierarchicalPlanResponse,
  DecomposeParams,
  DecomposeResponse,
} from '../types.js';

export class Plan {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate a flat execution plan for a user query (v1). */
  async generate(params: PlanParams): Promise<PlanResponse> {
    return this.client._request<PlanResponse>('POST', '/v1/agent-planner', params);
  }

  /** Generate a hierarchical plan with phases, architecture decisions (v2). */
  async generateHierarchical(params: HierarchicalPlanParams): Promise<HierarchicalPlanResponse> {
    return this.client._request<HierarchicalPlanResponse>('POST', '/v1/agent-planner', {
      ...params,
      version: 2,
    });
  }

  /** Decompose a complex step into substeps on-demand. */
  async decompose(params: DecomposeParams): Promise<DecomposeResponse> {
    return this.client._request<DecomposeResponse>('POST', '/v1/plan/decompose', params);
  }
}
