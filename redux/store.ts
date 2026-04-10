import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./slices/authSlice";
import { collectionReducer } from "./slices/collectionSlice";
import { profileReducer } from "./slices/profileSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    collection: collectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
