# MOU process guide

This is the current product path. There is **no e-signature vendor**. `executed` records signer metadata only.

## Who uses it

- Qualified investors (and their validated teammates) on their own engagements
- ZIDA Admin / Super Admin
- Ministry Admin on their ministry's engagements (oversight + comments; they do not replace ZIDA on dual-approval)

## Lifecycle

```
drafting → in_review → both_approved → finalized → ready_for_signature → executed
```

| Status | What it means | Who can move it |
|---|---|---|
| `drafting` | Structured form is editable | Investor owner / assigned teammate, ZIDA staff |
| `in_review` | Content is circulating for dual approval | Same editors; approvals start here |
| `both_approved` | Investor **and** an authorized ZIDA/admin user have approved | Finalize unlocks |
| `finalized` | `contentSnapshot` is frozen. Content edits stop. Formatting may still change until lock | Staff / owner per console rules |
| `ready_for_signature` | Formatting locked; waiting on off-platform signature | Staff records metadata |
| `executed` | Signer name, date, and location stored. No live signature capture | Staff |

## Dual approval

Both sides must approve draft content before Finalize:

- Investor approval stamps `investorApprovedAt` / `investorApprovedBy`
- ZIDA approval stamps `zidaApprovedAt` / `zidaApprovedBy`

ZIDA cannot unilaterally declare an MOU final.

## Comments and export

- Comments live on the Communication Hub thread scoped to the engagement (`visibility = "mou"`)
- DOCX export is available from the MOU registry / panel
- A finalized/executed MOU's `contentSnapshot` is downloadable as JSON from the MOU panel and listed in the investor **Document Vault** (`/deal-room/vault`)

## What is not in this product

- DocuSign / Adobe Sign / any click-to-sign overlay
- Per-viewer VDR watermarking of the exported file
