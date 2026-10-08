import ResourcePacksEditor from "@/components/ResourcePacksEditor";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminRole } from "@/lib/auth";

export default async function ResourcePacksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/account");

  return <div className="space-y-6"><h1 className="text-3xl font-bold text-white">Chapter downloads</h1>
    <p className="max-w-3xl text-stone-300">Arc 1 is included in new APKs. Publish Pack 1 for Arcs 2–6 and Pack 2 for Arcs 7–10 before making the matching APK available to players. Existing releases keep their original chapter split.</p>
    <ResourcePacksEditor /></div>;
}
