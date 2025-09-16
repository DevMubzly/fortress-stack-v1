import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <AuthLayout
      title="Fortress Admin Dashboard"
      subtitle="Sign in to your dashboard"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;