"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TRANSPORT_STATUSES_FIRST = 401000;
const CLIENT_STATUSES_FIRST = 402000;
var StatusCode;
(function (StatusCode) {
    StatusCode[StatusCode["STATUS_CODE_UNSPECIFIED"] = 0] = "STATUS_CODE_UNSPECIFIED";
    StatusCode[StatusCode["SUCCESS"] = 400000] = "SUCCESS";
    StatusCode[StatusCode["BAD_REQUEST"] = 400010] = "BAD_REQUEST";
    StatusCode[StatusCode["UNAUTHORIZED"] = 400020] = "UNAUTHORIZED";
    StatusCode[StatusCode["INTERNAL_ERROR"] = 400030] = "INTERNAL_ERROR";
    StatusCode[StatusCode["ABORTED"] = 400040] = "ABORTED";
    StatusCode[StatusCode["UNAVAILABLE"] = 400050] = "UNAVAILABLE";
    StatusCode[StatusCode["OVERLOADED"] = 400060] = "OVERLOADED";
    StatusCode[StatusCode["SCHEME_ERROR"] = 400070] = "SCHEME_ERROR";
    StatusCode[StatusCode["GENERIC_ERROR"] = 400080] = "GENERIC_ERROR";
    StatusCode[StatusCode["TIMEOUT"] = 400090] = "TIMEOUT";
    StatusCode[StatusCode["BAD_SESSION"] = 400100] = "BAD_SESSION";
    StatusCode[StatusCode["PRECONDITION_FAILED"] = 400120] = "PRECONDITION_FAILED";
    StatusCode[StatusCode["ALREADY_EXISTS"] = 400130] = "ALREADY_EXISTS";
    StatusCode[StatusCode["NOT_FOUND"] = 400140] = "NOT_FOUND";
    StatusCode[StatusCode["SESSION_EXPIRED"] = 400150] = "SESSION_EXPIRED";
    StatusCode[StatusCode["CANCELLED"] = 400160] = "CANCELLED";
    StatusCode[StatusCode["UNDETERMINED"] = 400170] = "UNDETERMINED";
    StatusCode[StatusCode["UNSUPPORTED"] = 400180] = "UNSUPPORTED";
    StatusCode[StatusCode["CONNECTION_LOST"] = TRANSPORT_STATUSES_FIRST + 10] = "CONNECTION_LOST";
    StatusCode[StatusCode["CONNECTION_FAILURE"] = TRANSPORT_STATUSES_FIRST + 20] = "CONNECTION_FAILURE";
    StatusCode[StatusCode["DEADLINE_EXCEEDED"] = TRANSPORT_STATUSES_FIRST + 30] = "DEADLINE_EXCEEDED";
    StatusCode[StatusCode["CLIENT_INTERNAL_ERROR"] = TRANSPORT_STATUSES_FIRST + 40] = "CLIENT_INTERNAL_ERROR";
    StatusCode[StatusCode["UNIMPLEMENTED"] = TRANSPORT_STATUSES_FIRST + 50] = "UNIMPLEMENTED";
    StatusCode[StatusCode["UNAUTHENTICATED"] = CLIENT_STATUSES_FIRST + 30] = "UNAUTHENTICATED";
})(StatusCode = exports.StatusCode || (exports.StatusCode = {}));
class YdbError extends Error {
    constructor(message, issues = []) {
        super(message);
        this.issues = issues;
    }
    static formatIssues(issues) {
        return issues ? JSON.stringify(issues, null, 2) : '';
    }
    static checkStatus(operation) {
        if (!operation.status) {
            throw new MissingStatus('Missing status!');
        }
        const status = operation.status;
        if (operation.status && !SUCCESS_CODES.has(status)) {
            const ErrCls = SERVER_SIDE_ERROR_CODES.get(status);
            if (!ErrCls) {
                throw new Error(`Unexpected status code ${status}!`);
            }
            else {
                throw new ErrCls(`${ErrCls.name}: ${YdbError.formatIssues(operation.issues)}`, operation.issues);
            }
        }
    }
}
exports.YdbError = YdbError;
YdbError.status = StatusCode.STATUS_CODE_UNSPECIFIED;
class ConnectionError extends YdbError {
}
exports.ConnectionError = ConnectionError;
class ConnectionFailure extends ConnectionError {
}
exports.ConnectionFailure = ConnectionFailure;
ConnectionFailure.status = StatusCode.CONNECTION_FAILURE;
class ConnectionLost extends ConnectionError {
}
exports.ConnectionLost = ConnectionLost;
ConnectionLost.status = StatusCode.CONNECTION_LOST;
class DeadlineExceed extends ConnectionError {
}
exports.DeadlineExceed = DeadlineExceed;
DeadlineExceed.status = StatusCode.DEADLINE_EXCEEDED;
class Unimplemented extends ConnectionError {
}
exports.Unimplemented = Unimplemented;
Unimplemented.status = StatusCode.UNIMPLEMENTED;
class Unauthenticated extends YdbError {
}
exports.Unauthenticated = Unauthenticated;
Unauthenticated.status = StatusCode.UNAUTHENTICATED;
class BadRequest extends YdbError {
}
exports.BadRequest = BadRequest;
BadRequest.status = StatusCode.BAD_REQUEST;
class Unauthorized extends YdbError {
}
exports.Unauthorized = Unauthorized;
Unauthorized.status = StatusCode.UNAUTHORIZED;
class InternalError extends YdbError {
}
exports.InternalError = InternalError;
InternalError.status = StatusCode.INTERNAL_ERROR;
class Aborted extends YdbError {
}
exports.Aborted = Aborted;
Aborted.status = StatusCode.ABORTED;
class Unavailable extends YdbError {
}
exports.Unavailable = Unavailable;
Unavailable.status = StatusCode.UNAVAILABLE;
class Overloaded extends YdbError {
}
exports.Overloaded = Overloaded;
Overloaded.status = StatusCode.OVERLOADED;
class SchemeError extends YdbError {
}
exports.SchemeError = SchemeError;
SchemeError.status = StatusCode.SCHEME_ERROR;
class GenericError extends YdbError {
}
exports.GenericError = GenericError;
GenericError.status = StatusCode.GENERIC_ERROR;
class BadSession extends YdbError {
}
exports.BadSession = BadSession;
BadSession.status = StatusCode.BAD_SESSION;
class Timeout extends YdbError {
}
exports.Timeout = Timeout;
Timeout.status = StatusCode.TIMEOUT;
class PreconditionFailed extends YdbError {
}
exports.PreconditionFailed = PreconditionFailed;
PreconditionFailed.status = StatusCode.PRECONDITION_FAILED;
class NotFound extends YdbError {
}
exports.NotFound = NotFound;
NotFound.status = StatusCode.NOT_FOUND;
class AlreadyExists extends YdbError {
}
exports.AlreadyExists = AlreadyExists;
AlreadyExists.status = StatusCode.ALREADY_EXISTS;
class SessionExpired extends YdbError {
}
exports.SessionExpired = SessionExpired;
SessionExpired.status = StatusCode.SESSION_EXPIRED;
class Cancelled extends YdbError {
}
exports.Cancelled = Cancelled;
Cancelled.status = StatusCode.CANCELLED;
class Undetermined extends YdbError {
}
exports.Undetermined = Undetermined;
Undetermined.status = StatusCode.UNDETERMINED;
class Unsupported extends YdbError {
}
exports.Unsupported = Unsupported;
Unsupported.status = StatusCode.UNSUPPORTED;
const SUCCESS_CODES = new Set([
    StatusCode.STATUS_CODE_UNSPECIFIED,
    StatusCode.SUCCESS
]);
const SERVER_SIDE_ERROR_CODES = new Map([
    [StatusCode.BAD_REQUEST, BadRequest],
    [StatusCode.UNAUTHORIZED, Unauthorized],
    [StatusCode.INTERNAL_ERROR, InternalError],
    [StatusCode.ABORTED, Aborted],
    [StatusCode.UNAVAILABLE, Unavailable],
    [StatusCode.OVERLOADED, Overloaded],
    [StatusCode.SCHEME_ERROR, SchemeError],
    [StatusCode.GENERIC_ERROR, GenericError],
    [StatusCode.TIMEOUT, Timeout],
    [StatusCode.BAD_SESSION, BadSession],
    [StatusCode.PRECONDITION_FAILED, PreconditionFailed],
    [StatusCode.ALREADY_EXISTS, AlreadyExists],
    [StatusCode.NOT_FOUND, NotFound],
    [StatusCode.SESSION_EXPIRED, SessionExpired],
    [StatusCode.CANCELLED, Cancelled],
    [StatusCode.UNDETERMINED, Undetermined],
    [StatusCode.UNSUPPORTED, Unsupported],
]);
class MissingOperation extends YdbError {
}
exports.MissingOperation = MissingOperation;
class MissingValue extends YdbError {
}
exports.MissingValue = MissingValue;
class MissingStatus extends YdbError {
}
exports.MissingStatus = MissingStatus;
class TimeoutExpired extends YdbError {
}
exports.TimeoutExpired = TimeoutExpired;
