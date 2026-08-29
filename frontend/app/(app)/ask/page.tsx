import { Sparkles } from "lucide-react";
import PagePlaceholder from "@/components/PagePlaceholder";

export default function AskPage() {
  return (
    <PagePlaceholder
      title="Ask MediCare AI"
      description="Ask questions about your uploaded records. Answers are grounded in your documents, with source evidence shown alongside — or a clear not-found-in-records response."
      icon={Sparkles}
      phase={5}
    />
  );
}
