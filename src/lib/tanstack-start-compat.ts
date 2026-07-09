type ServerFnOptions = { method?: string };

type ServerFnHandler<T extends (...args: any[]) => any> = T;

type ServerFnFactory = {
  inputValidator(fn: (data: unknown) => any): ServerFnFactory;
  middleware(middlewares: readonly any[]): ServerFnFactory;
  handler<T extends (...args: any[]) => any>(fn: T): ServerFnHandler<T>;
};

export function createServerFn(_options: ServerFnOptions = {}): ServerFnFactory {
  const factory: ServerFnFactory = {
    inputValidator() {
      return factory;
    },
    middleware() {
      return factory;
    },
    handler<T extends (...args: any[]) => any>(fn: T): ServerFnHandler<T> {
      return ((...args: any[]) => fn(...args)) as ServerFnHandler<T>;
    },
  };

  return factory;
}

export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function createMiddleware() {
  return {
    server<T extends (ctx: any) => any>(handler: T): T {
      return handler;
    },
    client<T extends (ctx: any) => any>(handler: T): T {
      return handler;
    },
  };
}

export function getRequest() {
  return undefined;
}
