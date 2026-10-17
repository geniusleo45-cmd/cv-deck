# Role and public-data access hardening

Public vendor listings now use an explicit allowlist, excluding bank details,
identity documents, registration references and private user contact fields.
The same allowlist is used by product details and by homepage/related-product
client cards, since server component props can be serialized to the browser.
Business phone and store address remain public storefront information.

Public product details require an active product and a verified vendor. Admins
retain inspection access. Public vendor status filters cannot reveal pending
or rejected vendors. Admin vendor approval responses omit the User relation.

JWT checks compare the stored role and session version with the current account.
Admin role changes increment the session version; affected users must sign in
again. Vendor/recruiter profile identifiers are refreshed from the database.

Replies in existing direct conversations must match the original message's two
participants. Conversation previews are restricted to the viewer's messages.
This change does not delete or repair historical conversations.

Run `npm run test:accounts`, `npm run test:payments`, `npm run test:recruiter`
and `npm run build`. Role regression tests use mocked database calls and assert
authorization decisions and query projections; they are not a live penetration
test or proof that every route has been audited. No database migration is needed.
