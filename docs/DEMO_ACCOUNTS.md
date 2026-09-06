# Stakeholder demo accounts (local only — do not commit)

Generated: 2026-09-06T19:54:04.308Z

Sign in at https://zidaproject.com/auth/sign-in. Every account below uses the same password:

`PEGWest@1235`

Naming rule: `<org>.admin` runs the org, `<org>.team` works in it.

| Role | Email | Name | What it's for |
| --- | --- | --- | --- |
| registered | registered+demo@zidaproject.com | Daniel Okoro | Newly self-registered investor, pre-verification — the qualification walkthrough starts here |
| qualified | qualified+demo@zidaproject.com | Grace Mutindi | Vetted investor and owner of the organisation team — the "My Team" persona |
| qualified | qualified.team+demo@zidaproject.com | Peter Lindqvist | Vetted investor, team member under Zambezi Growth Partners |
| qualified | qualified.team2+demo@zidaproject.com | Aisha Bello | Vetted investor, team member under Zambezi Growth Partners |
| government | zida.team+demo@zidaproject.com | Tafadzwa Mutasa | ZIDA desk reviewer — national scope, no ministry affiliation |
| government | zida.team2+demo@zidaproject.com | Rumbidzai Nyoni | ZIDA desk reviewer — national scope, no ministry affiliation |
| admin | zida.admin+demo@zidaproject.com | Farai Chigumba | ZIDA console admin — publishes projects and accredits investors |
| super_admin | super.admin+demo@zidaproject.com | Amara Sesay | Platform owner (Afronovation) — configuration, taxonomies, entitlements, override |
| ministry_admin | min-ict.admin+demo@zidaproject.com | Tapiwa Zvobgo | Ministry of Information Communication Technology, Postal and Courier Services — primary Ministry Official |
| ministry_admin | min-ict.admin2+demo@zidaproject.com | Chiedza Mabhena | Ministry of Information Communication Technology, Postal and Courier Services — peer Ministry Official (multi-admin case) |
| government | min-ict.team+demo@zidaproject.com | Blessing Chirwa | Platform-wide reviewer affiliated with Ministry of Information Communication Technology, Postal and Courier Services |
| ministry_admin | min-agriculture.admin+demo@zidaproject.com | Nyasha Gwenzi | Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement — primary Ministry Official |
| ministry_admin | min-agriculture.admin2+demo@zidaproject.com | Rudo Masuku | Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement — peer Ministry Official (multi-admin case) |
| government | min-agriculture.team+demo@zidaproject.com | Tinashe Mhaka | Platform-wide reviewer affiliated with Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement |
| ministry_admin | min-energy.admin+demo@zidaproject.com | Simbarashe Ncube | Ministry of Energy and Power Development — primary Ministry Official |
| ministry_admin | min-energy.admin2+demo@zidaproject.com | Memory Sibanda | Ministry of Energy and Power Development — peer Ministry Official (multi-admin case) |
| government | min-energy.team+demo@zidaproject.com | Takudzwa Moyo | Platform-wide reviewer affiliated with Ministry of Energy and Power Development |
| ministry_admin | min-industry.admin+demo@zidaproject.com | Panashe Dube | Ministry of Industry and Commerce — primary Ministry Official |
| ministry_admin | min-industry.admin2+demo@zidaproject.com | Vimbai Chihota | Ministry of Industry and Commerce — peer Ministry Official (multi-admin case) |
| government | min-industry.team+demo@zidaproject.com | Munyaradzi Bere | Platform-wide reviewer affiliated with Ministry of Industry and Commerce |
| registered | applicant1+demo@zidaproject.com | Sandile Nkomo | Pending investor application from Meridian Frontier Capital — queue depth for the approval walkthrough |
| registered | applicant2+demo@zidaproject.com | Chen Wei | Pending investor application from Pacific Rim Infrastructure Group — queue depth for the approval walkthrough |
| registered | applicant3+demo@zidaproject.com | Lerato Dlamini | Pending investor application from Ubuntu AgriFund — queue depth for the approval walkthrough |

## Two things to know before distributing

**A `government` account sees every ministry's projects.** Ministry affiliation on that role
drives routing and request-filing, not visibility. The ministry-scoped personas are the two
`ministry_admin` accounts in each ministry.

**Email to these addresses does not arrive.** There is no mailbox behind them, so applicant-facing
notifications bounce. In-app notifications work throughout, and staff alerts are unaffected because
they route to INQUIRY_ALERT_EMAIL. Do not ask a stakeholder to check their inbox.

## After the walkthrough

Deactivate these accounts from /super-admin/users using the per-user **Deactivate (archive)**
action, which sets `deactivated` and records a justification. The bulk control labelled "Suspend"
sets `suspended` instead, so use the per-user action if you want them archived.
