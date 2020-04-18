"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const events_1 = __importDefault(require("events"));
const bundle_1 = require("../proto/bundle");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const logging_1 = __importDefault(require("./logging"));
const retries_1 = require("./retries");
const errors_1 = require("./errors");
var TableService = bundle_1.Ydb.Table.V1.TableService;
var CreateSessionRequest = bundle_1.Ydb.Table.CreateSessionRequest;
var CreateSessionResult = bundle_1.Ydb.Table.CreateSessionResult;
var DescribeTableResult = bundle_1.Ydb.Table.DescribeTableResult;
var PrepareQueryResult = bundle_1.Ydb.Table.PrepareQueryResult;
var ExecuteQueryResult = bundle_1.Ydb.Table.ExecuteQueryResult;
var BeginTransactionResult = bundle_1.Ydb.Table.BeginTransactionResult;
class SessionService extends utils_1.BaseService {
    constructor(endpoint, authService) {
        const host = endpoint.toString();
        super(host, 'Ydb.Table.V1.TableService', TableService, authService);
        this.endpoint = endpoint;
        this.logger = logging_1.default();
    }
    async create() {
        const response = await this.api.createSession(CreateSessionRequest.create());
        const payload = utils_1.getOperationPayload(response);
        const { sessionId } = CreateSessionResult.decode(payload);
        return new Session(this.api, this.endpoint, sessionId, this.logger);
    }
}
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], SessionService.prototype, "create", null);
exports.SessionService = SessionService;
var SessionEvent;
(function (SessionEvent) {
    SessionEvent["SESSION_RELEASE"] = "SESSION_RELEASE";
    SessionEvent["SESSION_BROKEN"] = "SESSION_BROKEN";
})(SessionEvent || (SessionEvent = {}));
const AUTO_TX = {
    beginTx: {
        serializableReadWrite: {}
    },
    commitTx: true
};
class Session extends events_1.default {
    constructor(api, endpoint, sessionId, logger) {
        super();
        this.api = api;
        this.endpoint = endpoint;
        this.sessionId = sessionId;
        this.logger = logger;
        this.beingDeleted = false;
        this.free = true;
    }
    acquire() {
        this.free = false;
        this.logger.debug(`Acquired session ${this.sessionId} on endpoint ${this.endpoint.toString()}.`);
        return this;
    }
    release() {
        this.free = true;
        this.logger.debug(`Released session ${this.sessionId} on endpoint ${this.endpoint.toString()}.`);
        this.emit(SessionEvent.SESSION_RELEASE, this);
    }
    isFree() {
        return this.free && !this.isDeleted();
    }
    isDeleted() {
        return this.beingDeleted;
    }
    async delete() {
        if (this.isDeleted()) {
            return Promise.resolve();
        }
        this.beingDeleted = true;
        utils_1.ensureOperationSucceeded(await this.api.deleteSession({ sessionId: this.sessionId }));
    }
    async keepAlive() {
        utils_1.ensureOperationSucceeded(await this.api.keepAlive({ sessionId: this.sessionId }));
    }
    async createTable(tablePath, description) {
        const request = {
            sessionId: this.sessionId,
            path: `${this.endpoint.database}/${tablePath}`,
            columns: description.columns,
            primaryKey: description.primaryKeys
        };
        utils_1.ensureOperationSucceeded(await this.api.createTable(request));
    }
    async dropTable(tablePath) {
        const request = {
            sessionId: this.sessionId,
            path: `${this.endpoint.database}/${tablePath}`
        };
        // suppress error when dropping non-existent table
        utils_1.ensureOperationSucceeded(await this.api.dropTable(request), [errors_1.SchemeError.status]);
    }
    async describeTable(tablePath) {
        const request = {
            sessionId: this.sessionId,
            path: `${this.endpoint.database}/${tablePath}`
        };
        const response = await this.api.describeTable(request);
        const payload = utils_1.getOperationPayload(response);
        return DescribeTableResult.decode(payload);
    }
    async beginTransaction(txSettings) {
        const response = await this.api.beginTransaction({
            sessionId: this.sessionId,
            txSettings
        });
        const payload = utils_1.getOperationPayload(response);
        const { txMeta } = BeginTransactionResult.decode(payload);
        if (txMeta) {
            return txMeta;
        }
        throw new Error('Could not begin new transaction, txMeta is empty!');
    }
    async commitTransaction(txControl) {
        const request = {
            sessionId: this.sessionId,
            txId: txControl.txId
        };
        utils_1.ensureOperationSucceeded(await this.api.commitTransaction(request));
    }
    async rollbackTransaction(txControl) {
        const request = {
            sessionId: this.sessionId,
            txId: txControl.txId
        };
        utils_1.ensureOperationSucceeded(await this.api.rollbackTransaction(request));
    }
    async prepareQuery(queryText) {
        const request = {
            sessionId: this.sessionId,
            yqlText: queryText
        };
        const response = await this.api.prepareDataQuery(request);
        const payload = utils_1.getOperationPayload(response);
        return PrepareQueryResult.decode(payload);
    }
    async executeQuery(query, params = {}, txControl = AUTO_TX) {
        this.logger.trace('preparedQuery', JSON.stringify(query, null, 2));
        this.logger.trace('parameters', JSON.stringify(params, null, 2));
        let queryToExecute;
        if (typeof query === 'string') {
            queryToExecute = {
                yqlText: query
            };
        }
        else {
            queryToExecute = {
                id: query.queryId
            };
        }
        const request = {
            sessionId: this.sessionId,
            txControl,
            parameters: params,
            query: queryToExecute
        };
        const response = await this.api.executeDataQuery(request);
        const payload = utils_1.getOperationPayload(response);
        return ExecuteQueryResult.decode(payload);
    }
}
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "delete", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "keepAlive", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "createTable", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "dropTable", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "describeTable", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "beginTransaction", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "commitTransaction", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "rollbackTransaction", null);
__decorate([
    retries_1.retryable(),
    utils_1.pessimizable
], Session.prototype, "prepareQuery", null);
__decorate([
    utils_1.pessimizable
], Session.prototype, "executeQuery", null);
exports.Session = Session;
class SessionPool extends events_1.default {
    constructor(driver, minLimit = 5, maxLimit = 20, keepAlivePeriod = constants_1.SESSION_KEEPALIVE_PERIOD) {
        super();
        this.driver = driver;
        this.minLimit = minLimit;
        this.maxLimit = maxLimit;
        this.sessions = new Set();
        this.newSessionsRequested = 0;
        this.sessionsBeingDeleted = 0;
        this.prepopulateSessions();
        this.sessionKeepAliveId = this.initListeners(keepAlivePeriod);
        this.logger = logging_1.default();
    }
    async destroy() {
        this.logger.debug('Destroying pool...');
        clearInterval(this.sessionKeepAliveId);
        await Promise.all(lodash_1.default.map([...this.sessions], (session) => this.deleteSession(session)));
        this.logger.debug('Pool has been destroyed.');
    }
    initListeners(keepAlivePeriod) {
        this.on(SessionEvent.SESSION_BROKEN, async (sessionId) => {
            await this.deleteSession(sessionId);
        });
        return setInterval(async () => Promise.all(lodash_1.default.map([...this.sessions], (session) => session.keepAlive())), keepAlivePeriod);
    }
    prepopulateSessions() {
        lodash_1.default.forEach(lodash_1.default.range(this.minLimit), () => this.createSession());
    }
    async createSession() {
        const sessionCreator = await this.driver.getSessionCreator();
        const session = await sessionCreator.create();
        this.sessions.add(session);
        return session;
    }
    async deleteSession(session) {
        if (!session.isDeleted()) {
            this.sessionsBeingDeleted++;
            session.delete()
                .then(() => {
                this.sessions.delete(session);
                this.sessionsBeingDeleted--;
            });
        }
    }
    acquire(timeout = 0) {
        for (const session of this.sessions) {
            if (session.isFree()) {
                return Promise.resolve(session.acquire());
            }
        }
        if (this.sessions.size + this.newSessionsRequested - this.sessionsBeingDeleted <= this.maxLimit) {
            this.newSessionsRequested++;
            return this.createSession()
                .then((session) => {
                this.newSessionsRequested--;
                return session.acquire();
            });
        }
        else {
            return new Promise((resolve, reject) => {
                let timeoutId;
                if (timeout) {
                    timeoutId = setTimeout(() => {
                        reject(`No session became available within timeout of ${timeout} ms`);
                    }, timeout);
                }
                this.once(SessionEvent.SESSION_RELEASE, (session) => {
                    clearTimeout(timeoutId);
                    resolve(session);
                });
            });
        }
    }
    async withSession(callback, timeout = 0) {
        const session = await this.acquire(timeout);
        try {
            const result = await callback(session);
            session.release();
            return result;
        }
        catch (error) {
            await this.deleteSession(session);
            throw error;
            // TODO: add retry machinery here
        }
    }
}
exports.SessionPool = SessionPool;
class TableClient extends events_1.default {
    constructor(driver) {
        super();
        this.pool = new SessionPool(driver);
    }
    async withSession(callback, timeout = 0) {
        return this.pool.withSession(callback, timeout);
    }
    async destroy() {
        await this.pool.destroy();
    }
}
exports.TableClient = TableClient;
class Column {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}
exports.Column = Column;
class TableDescription {
    constructor(columns = [], primaryKeys = []) {
        this.columns = columns;
        this.primaryKeys = primaryKeys;
    }
    withColumn(column) {
        this.columns.push(column);
        return this;
    }
    withPrimaryKey(key) {
        this.primaryKeys.push(key);
        return this;
    }
    withPrimaryKeys(...keys) {
        for (const key of keys) {
            this.primaryKeys.push(key);
        }
        return this;
    }
}
exports.TableDescription = TableDescription;
