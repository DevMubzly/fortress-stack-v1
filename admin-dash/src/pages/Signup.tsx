import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <AuthLayout
      title="Create an admin account"
      subtitle="Fill in the details below"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;