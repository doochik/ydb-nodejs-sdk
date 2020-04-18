/// <reference types="pino" />
/// <reference types="node" />
import EventEmitter from 'events';
import { Ydb } from "../proto/bundle";
import { BaseService } from "./utils";
import { Endpoint } from './discovery';
import Driver from "./driver";
import { IAuthService } from "./credentials";
import { Logger } from './logging';
import TableService = Ydb.Table.V1.TableService;
import ICreateSessionResult = Ydb.Table.ICreateSessionResult;
import IType = Ydb.IType;
import DescribeTableResult = Ydb.Table.DescribeTableResult;
import PrepareQueryResult = Ydb.Table.PrepareQueryResult;
import ExecuteQueryResult = Ydb.Table.ExecuteQueryResult;
import ITransactionSettings = Ydb.Table.ITransactionSettings;
import ITransactionMeta = Ydb.Table.ITransactionMeta;
export declare class SessionService extends BaseService<TableService> {
    endpoint: Endpoint;
    private readonly logger;
    constructor(endpoint: Endpoint, authService: IAuthService);
    create(): Promise<Session>;
}
interface IExistingTransaction {
    txId: string;
}
interface INewTransaction {
    beginTx: ITransactionSettings;
    commitTx: boolean;
}
interface IQueryParams {
    [k: string]: Ydb.ITypedValue;
}
export declare class Session extends EventEmitter implements ICreateSessionResult {
    private api;
    endpoint: Endpoint;
    sessionId: string;
    private logger;
    private beingDeleted;
    private free;
    constructor(api: TableService, endpoint: Endpoint, sessionId: string, logger: Logger);
    acquire(): this;
    release(): void;
    isFree(): boolean;
    isDeleted(): boolean;
    delete(): Promise<void>;
    keepAlive(): Promise<void>;
    createTable(tablePath: string, description: TableDescription): Promise<void>;
    dropTable(tablePath: string): Promise<void>;
    describeTable(tablePath: string): Promise<DescribeTableResult>;
    beginTransaction(txSettings: ITransactionSettings): Promise<ITransactionMeta>;
    commitTransaction(txControl: IExistingTransaction): Promise<void>;
    rollbackTransaction(txControl: IExistingTransaction): Promise<void>;
    prepareQuery(queryText: string): Promise<PrepareQueryResult>;
    executeQuery(query: PrepareQueryResult | string, params?: IQueryParams, txControl?: IExistingTransaction | INewTransaction): Promise<ExecuteQueryResult>;
}
export declare class SessionPool extends EventEmitter {
    private driver;
    private readonly minLimit;
    private readonly maxLimit;
    private readonly sessions;
    private newSessionsRequested;
    private sessionsBeingDeleted;
    private readonly sessionKeepAliveId;
    private readonly logger;
    constructor(driver: Driver, minLimit?: number, maxLimit?: number, keepAlivePeriod?: number);
    destroy(): Promise<void>;
    private initListeners;
    private prepopulateSessions;
    private createSession;
    private deleteSession;
    private acquire;
    withSession(callback: (session: Session) => Promise<any>, timeout?: number): Promise<any>;
}
export declare class TableClient extends EventEmitter {
    private pool;
    constructor(driver: Driver);
    withSession(callback: (session: Session) => Promise<any>, timeout?: number): Promise<any>;
    destroy(): Promise<void>;
}
export declare class Column {
    name: string;
    type: IType;
    constructor(name: string, type: IType);
}
export declare class TableDescription {
    columns: Column[];
    primaryKeys: string[];
    constructor(columns?: Column[], primaryKeys?: string[]);
    withColumn(column: Column): this;
    withPrimaryKey(key: string): this;
    withPrimaryKeys(...keys: string[]): this;
}
export {};
