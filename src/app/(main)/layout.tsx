import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainLayoutClient } from "@/components/layout/MainLayoutClient";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return <MainLayoutClient>{children}</MainLayoutClient>;
}
