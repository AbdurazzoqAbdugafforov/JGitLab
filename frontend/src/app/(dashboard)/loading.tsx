import { JGitLabSplashLoader } from "@/components/brand/JGitLabBrand";

export default function DashboardLoading() {
  return <JGitLabSplashLoader label="Refreshing JGitLab Workspace..." fullScreen={false} />;
}
