export class ToqenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToqenError';
  }
}

export class ToqenCallbackError extends ToqenError {
  constructor(message: string) {
    super(message);
    this.name = 'ToqenCallbackError';
  }
}

export class ToqenRefreshError extends ToqenError {
  constructor(message: string) {
    super(message);
    this.name = 'ToqenRefreshError';
  }
}

export class ToqenSessionError extends ToqenError {
  constructor(message: string) {
    super(message);
    this.name = 'ToqenSessionError';
  }
}

export class ToqenConfigError extends ToqenError {
  constructor(message: string) {
    super(message);
    this.name = 'ToqenConfigError';
  }
}
