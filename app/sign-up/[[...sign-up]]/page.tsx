import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-50">
            <SignUp afterSignUpUrl="/dashboard" />
        </div>
    );
}
