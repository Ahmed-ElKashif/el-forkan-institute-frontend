import { configureStore } from '@reduxjs/toolkit';
import type { HttpClient } from '../http/http.port';
import { api } from './api';

/** Builds the Redux store around the RTK Query cache.
 *
 *  The transport is passed in, not imported, and handed to every thunk as its
 *  `extra` argument — which is how `httpBaseQuery` reaches the one
 *  `FetchHttpClient` the container built, without a module singleton. The store
 *  is created once, at the composition root, from that same client. */
export function makeStore(http: HttpClient) {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: { http } } }).concat(api.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
