type ServerFnOptions = { method?: string };

type ServerFnHandler<T extends (...args: any[]) => any> = T;

type ServerFnFactory = {
  handler<T extends (...args: any[]) => any>(fn: T): ServerFnHandler<T>;
};

export function createServerFn(_options: ServerFnOptions = {}): ServerFnFactory {
  return {
    handler<T extends (...args: any[]) => any>(fn: T): ServerFnHandler<T> {
      return ((...args: any[]) => fn(...args)) as ServerFnHandler<T>;
    },
  };
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
