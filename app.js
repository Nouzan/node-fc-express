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

// json :: Json b => a -> b -> IO(APIJSON)
const json = _.curry((body, res) => new IO(() => {
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
    console.log(`setup a route at ${ url }`);
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

// start :: Maybe(Number) -> (a -> b) -> IO(Maybe(Number))
const start = _.curry((m, f) => m.orElse(() => _.map(get, startLoop(f))));

// stop :: Maybe(Number) -> IO(Nothing)
const stop = _.compose(_.sequence(IO.of), _.map(stopLoop));

// setRoutes :: Express -> [Route] -> IO [Express]
const setRoutes = app => _.compose(_.sequence(IO.of), _.map(({ method, url, io_handler }) => io_handler.chain(handleReq(app, method, url))));

// runApp :: Express -> Number -> [Route] -> (() -> undefined) -> IO Express
const runApp = _.curry((app, port, routes, f) => _.compose(_.chain(listen(port, f)), _.map(_.last), setRoutes(app))(routes));

// closureIO :: IO(a) -> IO(() -> a)
const closureIO = io => IO.of(() => io.unsafePerformIO());

// res2FullIO :: (Response -> IO(a)) -> IO(Request -> Response -> Next -> a)
const res2FullIO = f => IO.of((req, res, next) => f(res).unsafePerformIO());

// tools.print :: a -> IO(undefined)
// io_loop :: IO(() -> undefined)
const io_loop = closureIO(tools.print('Looping'));

// maybeTimerID :: Maybe
var maybeTimerID = Maybe.Nothing();

// getMaybeTimerID :: () -> IO(undefined)
const getMaybeTimerID = () => IO.of(maybeTimerID);

// setMaybeTimerID :: Maybe -> IO(undefined)
const setMaybeTimerID = m => new IO(() => maybeTimerID = m);

const routes = [{
        'method': 'get', 
        'url': '/', 
        'io_handler': res2FullIO(
            json({'msg': 'Hello, Again'})
        )
    }, {
        'method': 'get',
        'url': '/start',
        'io_handler': res2FullIO(_.compose(
            _.chain(setMaybeTimerID),
            _.chain(() => getMaybeTimerID().map(start).ap(io_loop).join()),
            json({'msg': 'Started'})
        ))
    }, {
        'method': 'get',
        'url': '/stop',
        'io_handler': res2FullIO(_.compose(
            _.chain(setMaybeTimerID),
            _.chain(() => getMaybeTimerID().chain(stop)),
            json({'msg': 'Stopped'})
        ))
    }
];

// io_app :: IO Express
const io_app = IO.of(express());

// port :: Number
const port = 3000;

// io_init :: IO(() -> undefined)
const io_init = closureIO(tools.print(`Express is listening on ${ port }`));

// io_runApp :: IO Express
const io_run_app = io_app.chain(app => io_init.chain(runApp(app)(port)(routes)));

// Impure Code
// ====================

// do
io_run_app.unsafePerformIO();
