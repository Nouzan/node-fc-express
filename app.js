const _ = require("ramda");
const express = require("express");
const { IO, Maybe } = require("./support");
const { Result, APIError, parseResult, checkJsonBody } = require("./utils");

const app = express();

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

// setTimer :: Number -> (a -> b) -> IO(Number)
const setTimer = _.curry((interval, f) => new IO(() => setInterval(f, interval)));

// clearTimer :: Number -> IO(null)
const clearTimer = timerID => new IO(
    () => {clearInterval(timerID);}
);

// get :: a -> Maybe(a)
const get = Maybe.get;

// orElse :: (() -> Maybe(b)) -> Maybe(a) -> Maybe(b) / Maybe(a)
const orElse = Maybe.orElse;

// Application
// ********************
// startLoop :: (a -> b) -> IO(Number)
const startLoop = setTimer(1000);

// stopLoop :: Number -> IO(null)
const stopLoop = clearTimer;

// start :: (a -> b) -> Maybe(Number) -> IO(Maybe(Number))
const start = f => orElse(() => _.map(get, startLoop(f)));

// stop :: Maybe(Number) -> IO(Nothing)
const stop = _.compose(_.sequence(IO.of), _.map(stopLoop));

// Impure Code
// ====================

// loop :: () -> undefined
const loop = () => {
    console.log('Hello, Wrold');
}

var maybeTimerID = Maybe.Nothing();

app.get("/", (req, res, next) => {
    json(res, {'msg': "Hello, World"}).unsafePerformIO();
});

app.get("/start", (req, res, next) => {
    maybeTimerID = start(loop)(maybeTimerID).unsafePerformIO();
    json(res, {'msg': 'Start'}).unsafePerformIO();
});

app.get("/stop", (req, res, next) => {
    maybeTimerID = stop(maybeTimerID).unsafePerformIO();
    json(res, {'msg': 'Stop'}).unsafePerformIO();
});

app.listen(3000, () => {
    console.log("Server running on port 3001");
});
