import { ArrowLeftRight } from "lucide-react";
import PagePlaceholder from "@/components/PagePlaceholder";

export default function ComparePage() {
  return (
    <PagePlaceholder
      title="Compare / What Changed?"
      description="Pick Report A and Report B to see documented differences side by side, with evidence from the source documents and a clear line between recorded facts and AI explanation."
      icon={ArrowLeftRight}
      phase={6}
    />
  );
}
