import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { findActiveDraftInquiry, upsertDraftInquiry } from "@/lib/db/queries/inquiries";
import { mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { isWizardComplete, type InquiryWizardPayload } from "@/lib/governance/inquiry-wizard-validation";

/**
 * Autosave/resume + submit-lock backend for the Strategic Partnerships wizard (Investor
 * Qualification Vetting plan). Draft persistence only exists for signed-in applicants — an
 * anonymous visitor's one-shot submission keeps going through POST /api/inquiries unchanged.
 */

/** GET — resume: returns the current user's active draft/changes_requested application, or null. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json(null);
    const row = await findActiveDraftInquiry(user.userId);
    return NextResponse.json(row ? mapDbInquiryToApp(row) : null);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST — autosave: upserts the draft in place, never advancing its status. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to save your application progress." }, { status: 401 });
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
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to submit your application." }, { status: 401 });
    const body = (await request.json()) as InquiryWizardPayload & { isProjectLinked?: boolean };
    if (!isWizardComplete(body, Boolean(body.isProjectLinked))) {
      return NextResponse.json(
        { error: "This application is incomplete — every required field must be filled in before submitting." },
        { status: 400 }
      );
    }
    const row = await upsertDraftInquiry(user.userId, body, true);
    return NextResponse.json(mapDbInquiryToApp(row));
  } catch (error) {
    return handleRouteError(error);
  }
}
