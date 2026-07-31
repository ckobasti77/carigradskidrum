import { redirect } from "next/navigation";
import { hasSession } from "@/lib/admin/guard";
import { LoginForm } from "../login-form";

export default async function AdminLoginPage() {
  if (await hasSession()) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
