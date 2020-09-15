import { YdbError } from "./errors";
export declare class RetryParameters {
    retryNotFound: boolean;
    retryInternalError: boolean;
    unknownErrorHandler: (_error: unknown) => void;
    maxRetries: number;
    onYdbErrorCb: (_error: YdbError) => void;
    backoffCeiling: number;
    backoffSlotDuration: number;
    constructor({ maxRetries, onYdbErrorCb, backoffCeiling, backoffSlotDuration, }?: {
        maxRetries?: number | undefined;
        onYdbErrorCb?: ((_error: YdbError) => void) | undefined;
        backoffCeiling?: number | undefined;
        backoffSlotDuration?: number | undefined;
    });
}
export declare function retryable(strategyParams?: RetryParameters): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function withRetries<T>(originalFunction: () => Promise<T>, strategyParams?: RetryParameters): Promise<T>;
