const _ = require('ramda');
const Maybe = require('folktale/maybe');

// IO
// ********************
// functor for sync operation

class IO {
    constructor(f) {
        this.unsafePerformIO = f;
    }
    map(f) {
        return new IO(_.compose(f, this.unsafePerformIO));
    }
    ap(other_container) {
        // return this.map(g => g(other_container.unsafePerformIO()));
        return this.chain(g => other_container.map(g));
    }
    join() {
        return new IO(() => this.unsafePerformIO().unsafePerformIO());
    }
    chain(f) {
        return (this.map(f)).join();
    }
}

IO.of = x => new IO(() => x);

// Maybe
// ********************
// functor for Nullable

var Just = Maybe.Just;
var Nothing = Maybe.Nothing;

// get :: a -> Maybe(a)
const get = a => a === undefined || a === null ? Nothing() : Just(a);

// orElse :: (() -> Maybe(b)) -> Maybe(a) -> Maybe(b) / Maybe(a)
const orElse = _.curry((f, m) => m.orElse(f));

Just.prototype.sequence = function(of) { return this.value.map(get) };
Nothing.prototype.sequence = of => of(Nothing());

// Tools
// ********************

// print :: a -> IO(undefined)
const print = x => new IO(() => console.log(x));

// Impure
// debug :: a -> a
const debug = x => {
    console.log(x);
    return x;
};

module.exports = {
    IO: IO,
    Maybe: { Just: Just, Nothing: Nothing, get: get, orElse: orElse},
    tools: {
        print: print,
        debug: debug
    }
}