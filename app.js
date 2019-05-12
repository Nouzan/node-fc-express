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

// listen :: Listen a => Number -> (() -> undefined) -> a -> IO(a)
const listen = _.curry((port, f, server) => new IO(() => {
    server.listen(port, f);
    return server;
}));

// setTimer :: Number -> (a -> b) -> IO(Number)
const setTimer = _.curry((interval, f) => new IO(() => setInterval(f, interval)));

// clearTimer :: Number -> IO(undefined)
const clearTimer = timerID => new IO(
    () => {clearInterval(timerID);}
);

// handleReq :: Express -> Method -> URL -> (Request -> Response -> Next -> a) -> IO(Express)
// TODO: Check method and url
const handleReq = _.curry((app, method, url, f) => new IO(() => {
    console.log('setup a route.');
    app[method](url, f);
    // console.log(app);
    return app;
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

// setRoutes :: Express -> [Route] -> IO [Express]
const setRoutes = app => _.compose(_.sequence(IO.of), _.map(({ method, url, handler }) => handleReq(app, method, url, handler)));

// runApp :: Express -> Number -> (() -> undefined) -> [Route] -> IO Express
const runApp = (app, port, f) => _.compose(_.chain(listen(port, f)), _.map(_.last), setRoutes(app));

// print :: a -> IO(undefined)

// loop :: () -> undefined
const loop = () => {
    tools.print('Hello, World!').unsafePerformIO();
}

var maybeTimerID = Maybe.Nothing();

const routes = [{
        'method': 'get', 
        'url': '/', 
        'handler': (req, res, next) => { json(res, {'msg': 'Hello, Again'}).unsafePerformIO(); }
    }, {
        'method': 'get',
        'url': '/start',
        'handler': (req, res, next) => {
            maybeTimerID = start(loop)(maybeTimerID).unsafePerformIO();
            json(res, {'msg': 'The loop started.'}).unsafePerformIO();
        }
    }, {
        'method': 'get',
        'url': '/stop',
        'handler': (req, res, next) => {
            maybeTimerID = stop(maybeTimerID).unsafePerformIO();
            json(res, {'msg': 'Stop'}).unsafePerformIO();
        }
    }
];

// Impure Code
// ====================

const app = express();

runApp(app, 3000, () => {
     tools.print('Express is listening on 3000').unsafePerformIO();
})(routes).unsafePerformIO();

