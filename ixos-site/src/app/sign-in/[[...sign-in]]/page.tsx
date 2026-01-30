import { AuthScreen } from "@/components/auth/AuthScreen";
import { PageGlow } from "@/components/effects/PageGlow";

export default function SignInPage() {
  return (
    <>
      <PageGlow color="teal" />
      <div className="relative z-10">
        <AuthScreen mode="sign-in" />
      </div>
    </>
  );
}
