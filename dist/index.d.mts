import { MiddlewareHandler } from 'hono';

declare function sessionStart(options?: {
    cookie_name?: string;
    kvNamespace?: KVNamespace | string;
    prefix?: string;
    ttl?: number;
}): MiddlewareHandler;

type SessionObject = {
    readonly id: string;
    data: SessionData;
    readonly save: () => Promise<boolean>;
    readonly destroy: () => Promise<boolean>;
    is_deleted: boolean;
};
type SessionData = {
    [key: string]: any;
};

declare module 'hono' {
    interface ContextVariableMap {
        session: SessionObject | undefined;
    }
}

export { type SessionObject, sessionStart };
