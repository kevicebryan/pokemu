import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthUser = {
  id: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initialized: boolean;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.initialized = true;
    },
    clearAuthUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.initialized = true;
    },
    setAuthInitialized: (state) => {
      state.initialized = true;
    },
  },
});

export const { setAuthUser, clearAuthUser, setAuthInitialized } = authSlice.actions;
export const authReducer = authSlice.reducer;
