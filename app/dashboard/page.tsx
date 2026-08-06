import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold">
        Welcome {session.user?.name}
      </h1>

      <p className="mt-4">
        CV Deck Dashboard
      </p>
    </div>
  );
}