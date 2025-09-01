import { configureStore} from "@reduxjs/toolkit";
import { rootReducer } from "./slice";

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault(),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;