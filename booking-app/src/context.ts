import type { Sessions } from './auth.ts';
import type { Config } from './config.ts';
import type { Store } from './store.ts';

/** Everything a route needs, passed in rather than imported as globals. */
export type AppContext = {
    config: Config;
    store: Store;
    sessions: Sessions;
};
