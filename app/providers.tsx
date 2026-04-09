"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
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
        <Notifications position="top-right" />
        <AuthSync />
        {children}
      </MantineProvider>
    </Provider>
  );
}
