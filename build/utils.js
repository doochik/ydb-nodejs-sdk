"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc_1 = __importDefault(require("grpc"));
const lodash_1 = __importDefault(require("lodash"));
const errors_1 = require("./errors");
const errors_2 = require("./errors");
function removeProtocol(entryPoint) {
    const re = /^(grpc:\/\/|grpcs:\/\/)?(.+)/;
    const match = re.exec(entryPoint);
    return match[2];
}
class GrpcService {
    constructor(host, name, apiCtor, sslCredentials) {
        this.name = name;
        this.apiCtor = apiCtor;
        this.api = this.getClient(removeProtocol(host), sslCredentials);
    }
    getClient(host, sslCredentials) {
        const client = sslCredentials ?
            new grpc_1.default.Client(host, grpc_1.default.credentials.createSsl()) :
            new grpc_1.default.Client(host, grpc_1.default.credentials.createInsecure());
        const rpcImpl = (method, requestData, callback) => {
            const path = `/${this.name}/${method.name}`;
            client.makeUnaryRequest(path, lodash_1.default.identity, lodash_1.default.identity, requestData, null, null, callback);
        };
        return this.apiCtor.create(rpcImpl);
    }
}
exports.GrpcService = GrpcService;
class BaseService {
    constructor(host, name, apiCtor, authService) {
        this.name = name;
        this.apiCtor = apiCtor;
        this.authService = authService;
        this.metadata = null;
        this.api = new Proxy(this.getClient(removeProtocol(host), this.authService.sslCredentials), {
            get: (target, prop, receiver) => {
                const property = Reflect.get(target, prop, receiver);
                return BaseService.isServiceAsyncMethod(target, prop, receiver) ?
                    async (...args) => {
                        this.metadata = await this.authService.getAuthMetadata();
                        return property.call(target, ...args);
                    } :
                    property;
            }
        });
    }
    static isServiceAsyncMethod(target, prop, receiver) {
        return (Reflect.has(target, prop) &&
            typeof Reflect.get(target, prop, receiver) === 'function' &&
            prop !== 'create');
    }
    getClient(host, sslCredentials) {
        const client = sslCredentials ?
            new grpc_1.default.Client(host, grpc_1.default.credentials.createSsl(sslCredentials.rootCertificates)) :
            new grpc_1.default.Client(host, grpc_1.default.credentials.createInsecure());
        const rpcImpl = (method, requestData, callback) => {
            const path = `/${this.name}/${method.name}`;
            client.makeUnaryRequest(path, lodash_1.default.identity, lodash_1.default.identity, requestData, this.metadata, null, callback);
        };
        return this.apiCtor.create(rpcImpl);
    }
}
exports.BaseService = BaseService;
function getOperationPayload(response) {
    var _a, _b;
    const { operation } = response;
    if (operation) {
        errors_1.YdbError.checkStatus(operation);
        const value = (_b = (_a = operation) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.value;
        if (!value) {
            throw new errors_2.MissingValue('Missing operation result value!');
        }
        return value;
    }
    else {
        throw new errors_2.MissingOperation('No operation in response!');
    }
}
exports.getOperationPayload = getOperationPayload;
function ensureOperationSucceeded(response, suppressedErrors = []) {
    try {
        getOperationPayload(response);
    }
    catch (e) {
        if (suppressedErrors.indexOf(e.constructor.status) > -1) {
            return;
        }
        if (!(e instanceof errors_2.MissingValue)) {
            throw e;
        }
    }
}
exports.ensureOperationSucceeded = ensureOperationSucceeded;
function pessimizable(_target, _propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        try {
            return await originalMethod.call(this, ...args);
        }
        catch (error) {
            if (!(error instanceof errors_1.NotFound)) {
                this.endpoint.pessimize();
            }
            throw error;
        }
    };
    return descriptor;
}
exports.pessimizable = pessimizable;
