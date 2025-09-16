import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <AuthLayout
      title="Get Started with Fortress"
      subtitle="Create your admin account"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;