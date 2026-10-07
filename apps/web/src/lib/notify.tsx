import { notifications } from "@mantine/notifications";

/** One entry point for notifications. */
export const notify = {
  success: (message: string) => notifications.show({ message, color: "teal" }),
  error: (message: string) => notifications.show({ message, color: "red" }),
};
