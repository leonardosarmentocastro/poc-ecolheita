import type { Preview } from "@storybook/nextjs-vite";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <Notifications position="bottom-center" />
        <Story />
      </MantineProvider>
    ),
  ],
};

export default preview;
