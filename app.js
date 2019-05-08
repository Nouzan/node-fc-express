const _ = require("ramda");
const express = require("express");
const { IO, Maybe, tools } = require("./support");
const { Result, APIError, parseResult, checkJsonBody } = require("./utils");

// Pure Code
// ====================

// Helper
// ********************
// parseResult :: Result(APIError, JsonBody a) -> API_JSON
// checkJsonBody :: a -> Result(APIError, JsonBody a)

// parseBody :: a -> APIJSON
const parseBody = _.compose(parseResult, checkJsonBody);

// json :: Json a => a -> b -> IO(APIJSON)
const json = _.curry((res, body) => new IO(() => {
    res.json(parseBody(body));
    return parseBody(body);
}));

// listen :: Listen a => Number -> (() -> undefined) -> a -> IO(undefined)
const listen = _.curry((port, f, server) => new IO(() => {
    server.listen(port, f);
}));

// setTimer :: Number -> (a -> b) -> IO(Number)
const setTimer = _.curry((interval, f) => new IO(() => setInterval(f, interval)));

// clearTimer :: Number -> IO(undefined)
const clearTimer = timerID => new IO(
    () => {clearInterval(timerID);}
);

// handleReq :: Method -> URL -> (Request -> Response -> Next -> a) -> Express -> IO(undefined)
// TODO: Check method and url
const handleReq = _.curry((method, url, f, app) => new IO(() => {
    app[method](url, f);
}));

// get :: a -> Maybe(a)
const get = Maybe.get;

// orElse :: (() -> Maybe(b)) -> Maybe(a) -> Maybe(b) / Maybe(a)
const orElse = Maybe.orElse;

// Application
// ********************
// startLoop :: (a -> b) -> IO(Number)
const startLoop = setTimer(1000);

// stopLoop :: Number -> IO(undefined)
const stopLoop = clearTimer;

// start :: (a -> b) -> Maybe(Number) -> IO(Maybe(Number))
const start = f => orElse(() => _.map(get, startLoop(f)));

// stop :: Maybe(Number) -> IO(Nothing)
const stop = _.compose(_.sequence(IO.of), _.map(stopLoop));

// Impure Code
// ====================
const app = express();

// print :: a -> IO(undefined)

// loop :: () -> undefined
const loop = () => {
    tools.print('Hello, World!').unsafePerformIO();
}

var maybeTimerID = Maybe.Nothing();

// app['get']("/", (req, res, next) => {
//     json(res, {'msg': "Hello, World"}).unsafePerformIO();
// });
handleReq('get', '/', (req, res, next) => {
    json(res, {'msg': 'Hello, Again'}).unsafePerformIO();
}, app).unsafePerformIO();

// app.get("/start", (req, res, next) => {
//     maybeTimerID = start(loop)(maybeTimerID).unsafePerformIO();
//     json(res, {'msg': 'Start'}).unsafePerformIO();
// });
handleReq('get', '/start', (req, res, next) => {
    maybeTimerID = start(loop)(maybeTimerID).unsafePerformIO();
    json(res, {'msg': 'Start'}).unsafePerformIO();
}, app).unsafePerformIO();

// app.get("/stop", (req, res, next) => {
//     maybeTimerID = stop(maybeTimerID).unsafePerformIO();
//     json(res, {'msg': 'Stop'}).unsafePerformIO();
// });
handleReq('get', '/stop', (req, res, next) => {
    maybeTimerID = stop(maybeTimerID).unsafePerformIO();
    json(res, {'msg': 'Stop'}).unsafePerformIO();
}, app).unsafePerformIO();

listen(3000, () => {
    tools.print('Express listen on 3000').unsafePerformIO();
}, app).unsafePerformIO();
