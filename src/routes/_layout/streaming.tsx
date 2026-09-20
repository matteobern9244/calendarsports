import { createFileRoute } from "@tanstack/react-router";
import StreamingPage from "@/pages/StreamingPage";

export const Route = createFileRoute("/_layout/streaming")({
  component: StreamingPage,
});
