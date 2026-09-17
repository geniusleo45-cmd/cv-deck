import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "ADMIN":
      redirect("/dashboard/admin");
    case "VENDOR":
      redirect("/dashboard/vendor");
    case "RECRUITER":
      redirect("/dashboard/recruiter");
    default:
      redirect("/dashboard/customer");
  }
}