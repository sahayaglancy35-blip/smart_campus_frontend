import { useState } from "react";
import { LockClosedIcon, EnvelopeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { inputClass } from "../constants";

/* ================================================================
   FORGOT PASSWORD PAGE
   Owns its own email / sent state. onBack returns to the login page.
================================================================= */
function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Password reset requested for:", email);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-xl shadow-green-900/10 ring-1 ring-green-900/5 sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <LockClosedIcon className="h-6 w-6" />
        </div>

        {sent ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Check your inbox</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>,
              we've sent a link to reset the password.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium text-green-700 hover:text-green-900 hover:underline"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to login
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Forgot password?</h2>
            <p className="mt-1.5 text-[15px] text-gray-500">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="h-12 w-full rounded-lg bg-green-700 text-base font-semibold text-white shadow-sm transition hover:bg-green-800 active:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                Submit
              </button>

              <button
                type="button"
                onClick={onBack}
                className="flex w-full items-center justify-center gap-2 text-[15px] font-medium text-gray-500 hover:text-green-800"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;