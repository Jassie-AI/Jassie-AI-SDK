export class JassieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JassieError';
  }
}

export class JassieAPIError extends JassieError {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'JassieAPIError';
    this.status = status;
  }

  static fromResponse(status: number, body: any): JassieAPIError {
    const message = body?.error ?? `API error ${status}`;
    if (status === 401) return new JassieAuthenticationError(message);
    if (status === 429) {
      return new JassieRateLimitError(message);
    }
    return new JassieAPIError(status, message);
  }
}

export class JassieAuthenticationError extends JassieAPIError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'JassieAuthenticationError';
  }
}

export class JassieRateLimitError extends JassieAPIError {
  readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(429, message);
    this.name = 'JassieRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class JassieTimeoutError extends JassieError {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'JassieTimeoutError';
  }
}

export class JassieConnectionError extends JassieError {
  constructor(message = 'Connection failed') {
    super(message);
    this.name = 'JassieConnectionError';
  }
}
