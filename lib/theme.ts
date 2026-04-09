import { createTheme } from "@mantine/core";

export const pokemuTheme = createTheme({
  primaryColor: "orange",
  fontFamily: '"Syne Mono", "Trebuchet MS", Arial, sans-serif',
  headings: {
    fontFamily: '"Handjet", "Courier New", monospace',
    fontWeight: "700",
  },
  defaultRadius: 0,
  components: {
    Card: {
      defaultProps: {
        radius: 0,
        shadow: "md",
      },
      styles: {
        root: {
          boxShadow:
            "inset 0 0 0 2px var(--pokemu-border-light), 0 0 0 4px #000, 8px 8px 0 #000",
        },
      },
    },
  },
});
