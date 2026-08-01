import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Me-fie Directory Terms and Conditions — the rules and guidelines governing your use of our platform.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Terms and Conditions
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          Last updated: April 6, 2026
        </p>

        <div className="mt-12 space-y-10 text-gray-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_p]:mb-4">
          <section>
            <p>
              These Terms and Conditions govern the use of the Mefie Directory and the listing of businesses, events, and organisations on the Mefie platform. By submitting a listing or using the directory, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2>1. About Mefie</h2>
            <p>
              The Mefie Directory is a curated platform designed to showcase Ghanaian businesses, events, and community organisations globally. Mefie Ltd reserves the right to approve, reject, edit, or remove any listing at its discretion.
            </p>
          </section>

          <section>
            <h2>2. Eligibility and Applications</h2>
            <p>
              All businesses, events, and organisations must apply to be listed on the platform. Submission of an application does not guarantee approval.
            </p>
            <p>
              Mefie reviews all listings to ensure they meet the platform’s quality, relevance, and brand standards. Mefie reserves the right to reject applications that do not align with its values or platform objectives.
            </p>
          </section>

          <section>
            <h2>3. Listing Approval and Publication</h2>
            <p>
              Once a listing is approved, the applicant will be notified. Where applicable, payment must be completed before the listing is published. Listings will only go live once approval has been granted and payment has been successfully received.
            </p>
          </section>

          <section>
            <h2>4. Fees, Payments and Renewals</h2>
            <ul>
              <li>Listing fees are charged based on the selected package.</li>
              <li>All fees are payable in advance, non-refundable, and subject to change at Mefie’s discretion.</li>
              <li>Listings are valid for a 12-month period unless otherwise stated.</li>
              <li>Listings may be set to auto-renew annually, and by purchasing a listing, you agree that Mefie may charge the applicable renewal fee unless cancelled prior to the renewal date.</li>
              <li>Failure to renew may result in the listing being removed or downgraded.</li>
              <li>Payment does not guarantee continued listing on the platform.</li>
            </ul>
            <p>
              Mefie reserves the right to suspend or remove any listing at its discretion in accordance with these Terms.
            </p>
          </section>

          <section>
            <h2>5. No Guarantee of Results</h2>
            <p>
              Mefie provides a platform for visibility and discovery. However, Mefie does not guarantee traffic to listings, customer enquiries or sales, or specific levels of visibility. Performance may vary depending on user activity, competition, and other external factors.
            </p>
          </section>

          <section>
            <h2>6. Listing Content and Accuracy</h2>
            <p>
              Users are responsible for ensuring that all submitted information is accurate, complete, and up to date. Mefie is not responsible for the accuracy of user-submitted content. Mefie reserves the right to edit, update, or remove content that is inaccurate, misleading, or inappropriate.
            </p>
          </section>

          <section>
            <h2>7. Events Listings</h2>
            <p>
              Event organisers are responsible for ensuring event details are accurate. Mefie is not responsible for cancellations, changes to event details, or the quality or delivery of events. Event listings may be removed or archived after the event date.
            </p>
          </section>

          <section>
            <h2>8. Reviews and User Content</h2>
            <p>
              Where reviews or comments are enabled, users must ensure content is respectful, accurate, and lawful. Mefie reserves the right to remove any content that is defamatory, offensive, or misleading.
            </p>
          </section>

          <section>
            <h2>9. Intellectual Property</h2>
            <p>
              All content submitted remains the responsibility of the user. By submitting content, you grant Mefie a non-exclusive, worldwide, royalty-free licence to use, reproduce, display, and promote such content across the platform and in marketing materials.
            </p>
          </section>

          <section>
            <h2>10. Exclusivity</h2>
            <p>
              Listing on the Mefie Directory does not grant exclusivity within any category, location, or service type.
            </p>
          </section>

          <section>
            <h2>11. Limitation of Liability</h2>
            <p>
              Mefie acts as a platform connecting users with businesses, events, and organisations. Mefie shall not be liable for transactions between users and listed entities, the quality of products or services, or any loss, damage, or disputes arising from use of the platform.
            </p>
          </section>

          <section>
            <h2>12. Suspension and Removal</h2>
            <p>
              Mefie reserves the right to suspend or remove listings without notice if these Terms are breached, payment obligations are not met, or content is misleading, inappropriate, or harmful.
            </p>
          </section>

          <section>
            <h2>13. Platform Changes</h2>
            <p>
              Mefie may update, modify, or discontinue any part of the directory, including pricing and features, at any time.
            </p>
          </section>

          <section>
            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales.
            </p>
          </section>

          <section>
            <h2>15. Contact</h2>
            <p>
              For any queries, please contact:<br />
              <strong>Mefie Ltd</strong><br />
              Email: support@me-fie.com
            </p>
          </section>

          <section className="pt-8 border-t border-gray-200">
            <p className="font-semibold text-gray-900">
              By using the Mefie Directory, you confirm that you have read and agreed to these Terms and Conditions.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
