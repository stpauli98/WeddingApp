import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Prijava</h1>
      </div>
      <LoginForm />
    </div>
  )
}
