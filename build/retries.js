"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const logging_1 = __importDefault(require("./logging"));
const errors = __importStar(require("./errors"));
class RetryParameters {
    constructor({ maxRetries = 10, onYdbErrorCb = (_error) => { }, backoffCeiling = 6, backoffSlotDuration = 1, } = {}) {
        this.maxRetries = maxRetries;
        this.onYdbErrorCb = onYdbErrorCb;
        this.backoffCeiling = backoffCeiling;
        this.backoffSlotDuration = backoffSlotDuration;
        this.retryNotFound = true;
        this.retryInternalError = true;
        this.unknownErrorHandler = () => { };
    }
}
exports.RetryParameters = RetryParameters;
const RETRYABLE_ERRORS = [
    errors.Unavailable, errors.Aborted, errors.BadSession, errors.NotFound, errors.InternalError
];
const RETRYABLE_W_DELAY_ERRORS = [errors.Overloaded, errors.ConnectionError];
class RetryStrategy {
    constructor(methodName = 'UnknownClass::UnknownMethod', retryParameters) {
        this.methodName = methodName;
        this.retryParameters = retryParameters;
        this.logger = logging_1.default();
    }
    static async waitBackoffTimeout(retryParameters, retries) {
        const slotsCount = 1 << Math.min(retries, retryParameters.backoffCeiling);
        const maxDuration = slotsCount * retryParameters.backoffSlotDuration;
        const duration = Math.random() * maxDuration;
        return new Promise((resolve) => {
            setTimeout(resolve, duration);
        });
    }
    async retry(asyncMethod) {
        let retries = 0;
        let error = null;
        const retryParameters = this.retryParameters;
        while (retries < retryParameters.maxRetries) {
            try {
                return await asyncMethod();
            }
            catch (e) {
                const errName = e.constructor.name;
                error = e;
                const retriesLeft = retryParameters.maxRetries - retries;
                if (RETRYABLE_ERRORS.some((cls) => e instanceof cls)) {
                    this.logger.warn(`Caught an error ${errName}, retrying immediately, ${retriesLeft} retries left`);
                    retryParameters.onYdbErrorCb(e);
                    if (e instanceof errors.NotFound && !retryParameters.retryNotFound) {
                        throw e;
                    }
                    if (e instanceof errors.InternalError && !retryParameters.retryInternalError) {
                        throw e;
                    }
                }
                else if (RETRYABLE_W_DELAY_ERRORS.some((cls) => e instanceof cls)) {
                    this.logger.warn(`Caught an error ${errName}, retrying with a backoff, ${retriesLeft} retries left`);
                    retryParameters.onYdbErrorCb(e);
                    await RetryStrategy.waitBackoffTimeout(retryParameters, retries);
                }
                else if (e instanceof errors_1.YdbError) {
                    retryParameters.onYdbErrorCb(e);
                    throw e;
                }
                else {
                    retryParameters.unknownErrorHandler(e);
                    throw e;
                }
            }
            retries++;
        }
        if (error) {
            this.logger.debug('All retries have been used, re-throwing error');
            throw error;
        }
    }
}
function retryable(strategyParams) {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        const wrappedMethodName = `${target.constructor.name}::${propertyKey}`;
        if (!strategyParams) {
            strategyParams = new RetryParameters();
        }
        const strategy = new RetryStrategy(wrappedMethodName, strategyParams);
        descriptor.value = async function (...args) {
            return await strategy.retry(async () => await originalMethod.call(this, ...args));
        };
    };
}
exports.retryable = retryable;
async function withRetries(originalFunction, strategyParams) {
    const wrappedMethodName = originalFunction.name;
    if (!strategyParams) {
        strategyParams = new RetryParameters();
    }
    const strategy = new RetryStrategy(wrappedMethodName, strategyParams);
    return await strategy.retry(originalFunction);
}
exports.withRetries = withRetries;
