export declare class RetryParameters {
    retryNotFound: boolean;
    retryInternalError: boolean;
    unknownErrorHandler: (_error: Error) => void;
    maxRetries: number;
    onYdbErrorCb: (_error: Error) => void;
    backoffCeiling: number;
    backoffSlotDuration: number;
    constructor({ maxRetries, onYdbErrorCb, backoffCeiling, backoffSlotDuration, }?: {
        maxRetries?: number | undefined;
        onYdbErrorCb?: ((_error: Error) => void) | undefined;
        backoffCeiling?: number | undefined;
        backoffSlotDuration?: number | undefined;
    });
}
export declare function retryable(strategyParams?: RetryParameters): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function withRetries(originalFunction: (...args: any) => Promise<any>, strategyParams?: RetryParameters): Promise<any>;
