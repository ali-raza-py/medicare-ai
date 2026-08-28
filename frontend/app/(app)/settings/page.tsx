import { Settings } from "lucide-react";
import PagePlaceholder from "@/components/PagePlaceholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Profile and settings"
      description="Manage your profile, account preferences, and data settings. Built after the core workflow is complete."
      icon={Settings}
    />
  );
}
