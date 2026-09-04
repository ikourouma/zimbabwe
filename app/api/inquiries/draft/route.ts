import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import {
  findActiveDraftInquiry,
  findLatestApplicationStatus,
  hasPendingApplication,
  upsertDraftInquiry,
} from "@/lib/db/queries/inquiries";
import { mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { sendStaffNewSubmissionEmail } from "@/lib/email/inquiry-notifications";
import { isWizardComplete, type InquiryWizardPayload } from "@/lib/governance/inquiry-wizard-validation";

/**
 * Autosave/resume + submit-lock backend for the Strategic Partnerships wizard (Investor
 * Qualification Vetting plan). Draft persistence only exists for signed-in applicants — an
 * anonymous visitor's one-shot submission keeps going through POST /api/inquiries unchanged.
 */

/** GET — resume + status. `draft` is the editable slot (status draft/changes_requested, same
 *  shape callers have always prefilled from); `latestStatus`/`reviewNotes` additionally surface
 *  pending/approved/declined, which `draft` can never carry since those rows are locked out of
 *  the editable-slot lookup (application-state blind spot fix). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ draft: null, latestStatus: null, reviewNotes: null });

    const draftRow = await findActiveDraftInquiry(user.userId);
    if (draftRow) {
      const app = mapDbInquiryToApp(draftRow);
      return NextResponse.json({ draft: app, latestStatus: app.status ?? null, reviewNotes: app.reviewNotes ?? null });
    }

    const latest = await findLatestApplicationStatus(user.userId);
    return NextResponse.json({ draft: null, latestStatus: latest?.status ?? null, reviewNotes: latest?.reviewNotes ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST — autosave: upserts the draft in place, never advancing its status. Refuses to run while
 *  a `pending` application already exists, since there is then no editable slot to autosave into
 *  and upsertDraftInquiry would otherwise insert a second, duplicate application. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to save your application progress." }, { status: 401 });
    if (await hasPendingApplication(user.userId)) {
      return NextResponse.json(
        { error: "You already have an application submitted and awaiting review." },
        { status: 409 }
      );
    }
    const payload = (await request.json()) as InquiryWizardPayload;
    const row = await upsertDraftInquiry(user.userId, payload, false);
    return NextResponse.json(mapDbInquiryToApp(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH — submit: re-validates the full payload server-side (mirroring the client's step-by-step
 * rules — see lib/governance/inquiry-wizard-validation.ts) before locking the application into
 * `pending`, so an incomplete inquiry can never reach the review queue via a direct API call.
 * Same duplicate guard as POST — a second submission while one is already `pending` is rejected
 * rather than silently inserted as a new row.
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to submit your application." }, { status: 401 });
    if (await hasPendingApplication(user.userId)) {
      return NextResponse.json(
        { error: "You already have an application submitted and awaiting review." },
        { status: 409 }
      );
    }
    const body = (await request.json()) as InquiryWizardPayload & { isProjectLinked?: boolean };
    if (!isWizardComplete(body, Boolean(body.isProjectLinked))) {
      return NextResponse.json(
        { error: "This application is incomplete — every required field must be filled in before submitting." },
        { status: 400 }
      );
    }
    const row = await upsertDraftInquiry(user.userId, body, true);

    // Was missing entirely before this fix — the wizard's submit path never logged anything, so
    // the notification bell/activity feed never surfaced a new application (Qualified Investor
    // banner + pilot closeout plan). The one-shot POST /api/inquiries already logs this same
    // action for its own submissions.
    void logAuditEvent({
      actorUserId: user.userId,
      actorName: row.name,
      action: "inquiry.submitted",
      entityType: "inquiry",
      entityId: row.id,
      metadata: { type: row.type, email: row.email, engagementType: row.engagementType },
    });

    if (row.engagementType === "investor") {
      void sendStaffNewSubmissionEmail({
        organization: row.organization || row.name,
        name: row.name,
        email: row.email,
      });
    }

    return NextResponse.json(mapDbInquiryToApp(row));
  } catch (error) {
    return handleRouteError(error);
  }
}
