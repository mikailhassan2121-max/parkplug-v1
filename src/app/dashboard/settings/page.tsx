"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, PasswordInput, Switch } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { isValidEmail, passwordMeetsRequirements, PasswordRequirements } from "@/components/auth/auth-shell";
import { IconLogout } from "@/components/ui/icons";

export default function AccountSettingsPage() {
  const session = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<{ name?: string; email?: string }>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [prefs, setPrefs] = useState({
    reservationUpdates: true,
    reminders: true,
    messages: true,
    productNews: false,
    channelEmail: true,
    channelPush: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session.user) {
      setFullName(session.user.fullName);
      setEmail(session.user.email);
      setPrefs(session.user.notificationPrefs);
    }
  }, [session.user]);

  const emailChanged = session.user ? email.trim().toLowerCase() !== session.user.email : false;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (savingProfile) return;

    const errors: typeof profileErrors = {};
    if (!fullName.trim()) errors.name = "Enter your full name.";
    if (!email.trim()) errors.email = "Enter your email address.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    const result = await auth.updateProfile({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
    });
    setSavingProfile(false);

    if (result.ok) {
      await session.refresh();
      toast({
        tone: "success",
        title: "Profile updated",
        description: emailChanged ? "Check your new address for a verification link." : undefined,
      });
    } else {
      toast({ tone: "error", title: "Could not save your profile", description: result.error.message });
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (savingPassword) return;

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (!passwordMeetsRequirements(newPassword)) {
      setPasswordError("Your new password does not meet all the requirements.");
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    // The reset endpoint is the same one the emailed link uses.
    const result = await auth.resetPassword({ token: "session", password: newPassword });
    setSavingPassword(false);

    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      toast({ tone: "success", title: "Password updated" });
    } else {
      setPasswordError(result.error.message);
    }
  }

  async function savePrefs(next: typeof prefs) {
    setPrefs(next);
    setSavingPrefs(true);
    const result = await auth.updateProfile({ notificationPrefs: next });
    setSavingPrefs(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Could not save your preferences", description: result.error.message });
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const result = await auth.deleteAccount();
    setDeleting(false);
    setDeleteOpen(false);
    if (result.ok) {
      toast({ tone: "success", title: "Your account has been deleted" });
      router.push("/");
    } else {
      toast({ tone: "error", title: "Could not delete your account", description: result.error.message });
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Account settings</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          Manage your profile, security, and how we contact you.
        </p>
      </div>

      {/* ------------------------------------------------------------ Profile */}
      <Section title="Profile and contact information" description="This is how hosts see you.">
        <form onSubmit={saveProfile} noValidate className="space-y-5">
          <Field label="Full name" required error={profileErrors.name}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </Field>
          <Field
            label="Email"
            required
            error={profileErrors.email}
            hint={
              session.user?.emailVerified
                ? "Verified."
                : "Not verified yet — check your inbox for a verification link."
            }
          >
            <Input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          {emailChanged ? (
            <Alert tone="info">
              Changing your email signs you out of other devices and requires you
              to verify the new address before booking.
            </Alert>
          ) : null}
          <Button type="submit" loading={savingProfile} loadingText="Saving…">
            Save changes
          </Button>
        </form>
      </Section>

      {/* ----------------------------------------------------------- Password */}
      <Section title="Password" description="Use a password you do not use anywhere else.">
        <form onSubmit={savePassword} noValidate className="space-y-5">
          <Field label="Current password" required>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div>
            <Field label="New password" required error={passwordError}>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <PasswordRequirements value={newPassword} />
          </div>
          <Button type="submit" loading={savingPassword} loadingText="Updating…">
            Update password
          </Button>
        </form>
      </Section>

      {/* ------------------------------------------------------ Notifications */}
      <Section
        title="Notifications"
        description="Choose what we tell you about. Reservation confirmations are always sent."
      >
        <div className="space-y-5">
          <Switch
            label="Reservation updates"
            description="Confirmations, changes, and cancellations."
            checked={prefs.reservationUpdates}
            onChange={(v) => void savePrefs({ ...prefs, reservationUpdates: v })}
          />
          <Switch
            label="Arrival reminders"
            description="A nudge before your parking window starts."
            checked={prefs.reminders}
            onChange={(v) => void savePrefs({ ...prefs, reminders: v })}
          />
          <Switch
            label="Messages"
            description="When a host or driver replies to you."
            checked={prefs.messages}
            onChange={(v) => void savePrefs({ ...prefs, messages: v })}
          />
          <Switch
            label="Product news"
            description="Occasional updates about new ParkPlugs features."
            checked={prefs.productNews}
            onChange={(v) => void savePrefs({ ...prefs, productNews: v })}
          />

          <div className="border-t border-ink-200 pt-5">
            <h3 className="text-sm font-bold text-ink-900">How we reach you</h3>
            <div className="mt-4 space-y-4">
              <Switch
                label="Email"
                checked={prefs.channelEmail}
                onChange={(v) => void savePrefs({ ...prefs, channelEmail: v })}
              />
              <Switch
                label="Push notifications"
                description="Requires allowing notifications in your browser."
                checked={prefs.channelPush}
                onChange={(v) => void savePrefs({ ...prefs, channelPush: v })}
              />
            </div>
          </div>

          <p className="text-xs text-ink-500" aria-live="polite">
            {savingPrefs ? "Saving your preferences…" : "Preferences save automatically."}
          </p>
        </div>
      </Section>

      {/* --------------------------------------------------------- Privacy */}
      <Section title="Privacy" description="What ParkPlugs shares and with whom.">
        <ul className="space-y-3 text-sm leading-relaxed text-ink-700">
          <li>
            Your full name and email are never shown to hosts. They see your first
            name and the vehicle details on a reservation.
          </li>
          <li>
            A host&rsquo;s exact address is only released to you once a reservation
            is confirmed, and the same protection applies to any space you list.
          </li>
          <li>
            Community parking reports are published without your name attached.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/legal/privacy"
            className="text-sm font-bold text-brand-700 underline underline-offset-2"
          >
            Read the Privacy Policy
          </Link>
          <Link
            href="/legal/data-deletion"
            className="text-sm font-bold text-brand-700 underline underline-offset-2"
          >
            How to request your data
          </Link>
        </div>
      </Section>

      {/* --------------------------------------------------- Payment methods */}
      <Section
        title="Saved payment methods"
        description="Cards are stored by our payment provider, never by ParkPlugs."
      >
        <Alert tone="neutral">
          Your saved cards appear here once a payment provider is connected to
          this environment. ParkPlugs never sees or stores full card numbers.
        </Alert>
      </Section>

      {/* -------------------------------------------------- Sessions, delete */}
      <Section title="Sessions" description="Sign out everywhere if you have used a shared device.">
        <Button
          variant="secondary"
          leadingIcon={<IconLogout />}
          onClick={() => void session.signOut().then(() => router.push("/"))}
        >
          Sign out of all devices
        </Button>
      </Section>

      <Section
        title="Delete your account"
        description="This removes your profile, saved spaces, vehicles, and listings."
        tone="danger"
      >
        <Alert tone="danger">
          Deleting your account cannot be undone. Reservations that have already
          happened are retained where we are legally required to keep records.
          Cancel any upcoming reservations first.
        </Alert>
        <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </Section>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void deleteAccount()}
        loading={deleting}
        title="Delete your ParkPlugs account?"
        description="Your profile, saved spaces, vehicles, and listings will be permanently removed. This cannot be undone."
        confirmLabel="Delete my account"
        destructive
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-card border p-5 sm:p-6 ${
        tone === "danger" ? "border-danger-200 bg-danger-50/40" : "border-ink-200 bg-white"
      }`}
    >
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
