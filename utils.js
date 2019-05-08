const _ = require('ramda');
const union = require('folktale/adt/union/union');
const { IO } = require('./support');

// Result(Ok(a), Error(APIError))
const Result = union('Result', {
    Ok(value) { return { value }; },
    Error(reason) { return { reason }; }
});

// APIError(NetworkError(String), ServiceError(Number, String), ParsingError(String, a))
const APIError = union('APIError', {
    NetworkError(error) { return { error }; },
    ServiceError(code, message) { return { code, message }; },
    ParsingError(error, data) { return { error, data }; }
});

// parseError :: APIError -> APIJSON
const parseError = error => error.matchWith({
    NetworkError: ({ error }) => { return { data: null, status: false, errorType: 'Network Error', message: error, serviceCode: null }; },
    ServiceError: ({ code, error }) => { return { data: null, status: false, errorType: 'Service Error', serviceCode: code, message: error }; },
    ParsingError: ({ error }) => { return { data: null, status: false, errorType: 'Parsing Error', message: error, serviceCode: null }; }
});

// parseResult :: Result(APIError, JsonBody a) -> APIJSON
const parseResult = result => result.matchWith({
    Error: ({ reason }) => parseError(reason),
    Ok: ({ value }) => { return { data: value, status: true, message: 'Ok' } }
})

// checkJsonBody :: a -> Result(APIError, JsonBody a)
const checkJsonBody = body => body instanceof Array || body instanceof Object ?
    Result.Ok(body) :
    Result.hasInstance(body) ?
        body :
        Result.Error(APIError.ParsingError('failed to parse data into json body.'));

module.exports = {
    Result: Result,
    APIError: APIError,
    parseResult: parseResult,
    checkJsonBody: checkJsonBody
}