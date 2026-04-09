"use client";

import { MantineProvider } from "@mantine/core";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { pokemuTheme } from "@/lib/theme";
import { AuthSync } from "@/components/app/AuthSync";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <MantineProvider defaultColorScheme="dark" theme={pokemuTheme}>
        <AuthSync />
        {children}
      </MantineProvider>
    </Provider>
  );
}
