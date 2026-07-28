import { Suspense } from "react";
import ResetPassword from "./reset-password-content";

export default function Page() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
