import { CalendarClock } from "lucide-react";
import PagePlaceholder from "@/components/PagePlaceholder";

export default function TimelinePage() {
  return (
    <PagePlaceholder
      title="Timeline"
      description="Every documented event in chronological order, with dates, document types, and links back to the source documents."
      icon={CalendarClock}
      phase={4}
    />
  );
}
