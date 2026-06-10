import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, User } from "lucide-react";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
    setSuccess("");
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!validateEmail(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!form.subject.trim()) {
      nextErrors.subject = "Please enter a subject.";
    }

    if (!form.message.trim()) {
      nextErrors.message = "Please enter your message.";
    } else if (form.message.trim().length < 10) {
      nextErrors.message = "Message should be at least 10 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccess("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setForm(initialForm);
      setErrors({});
      setSuccess(
        "Thanks for contacting Sellify. Your message has been received on this device."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-green-100 bg-gradient-to-br from-green-50 via-white to-green-100 p-6 shadow-sm sm:rounded-[2rem] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
            Contact Sellify
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Need help with the marketplace?
          </h1>

          <p className="mt-5 text-base leading-7 text-slate-600">
            Send a message about buying, selling, listings, chat, favorites,
            notifications, dashboard tools, or any Sellify account question.
            This form gives frontend feedback only and does not require a
            backend service.
          </p>

          <div className="mt-8 grid gap-4">
            <InfoItem
              icon={Mail}
              title="Marketplace support"
              description="Use the form to describe what happened and what you need help with."
            />
            <InfoItem
              icon={User}
              title="Account questions"
              description="Include the email address connected to your Firebase account if it helps explain the issue."
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
          {success && (
            <div className="mb-5 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Your full name"
              disabled={loading}
            />

            <InputField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              disabled={loading}
            />

            <InputField
              label="Subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              error={errors.subject}
              placeholder="How can Sellify help?"
              disabled={loading}
            />

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                Message
              </span>

              <textarea
                name="message"
                rows="6"
                value={form.message}
                onChange={handleChange}
                placeholder="Write your message..."
                disabled={loading}
                className={`w-full rounded-2xl border px-5 py-4 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${
                  errors.message
                    ? "border-red-300 focus:border-red-500"
                    : "border-slate-300 focus:border-green-500"
                }`}
              />

              {errors.message && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {errors.message}
                </p>
              )}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
              {loading ? "Submitting..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function InfoItem({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-green-100 bg-white p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-600">
        <Icon size={21} />
      </div>

      <div className="min-w-0">
        <h2 className="font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-2xl border px-5 py-4 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${
          error
            ? "border-red-300 focus:border-red-500"
            : "border-slate-300 focus:border-green-500"
        }`}
      />

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
    </label>
  );
}

export default Contact;
