import { LoginForm } from "@/components/login-form"

export default function Home() {
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Dobrodošli</h1>
        <p className="text-muted-foreground mt-2">
          Molimo vas da se prijavite kako biste pristupili svadbenoj aplikaciji
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
