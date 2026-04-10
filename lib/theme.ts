import { createTheme } from "@mantine/core";

export const pokemuTheme = createTheme({
  primaryColor: "mistral",
  primaryShade: { light: 6, dark: 6 },
  colors: {
    mistral: [
      "#FFF7DC",
      "#FFEFAD",
      "#FFE57A",
      "#FFD800",
      "#FFAF00",
      "#FF8205",
      "#FA500F",
      "#E5480E",
      "#A3320A",
      "#8b1f00",
    ],
  },
  fontFamily: '"Syne Mono", "Trebuchet MS", Arial, sans-serif',
  headings: {
    fontFamily: '"Handjet", "Courier New", monospace',
    fontWeight: "900",
  },
  defaultRadius: 0,
  components: {
    Card: {
      defaultProps: {
        radius: 0,
        shadow: "none",
      },
    },
  },
});

export const SKY_BG = "#fffcf8";
