import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Me-fie Directory Privacy Policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-(--background-secondary)">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          Last updated: 7 April 2026
        </p>

        <div className="mt-12 space-y-10 text-gray-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_p]:mb-4">
          <section>
            <h2>1. Who We Are</h2>
            <p>
              Mefie Directory is operated by Mefie Limited, registered in the United Kingdom.
            </p>
            <p>
              <strong>Registered office:</strong><br />
              167–169 Great Portland Street<br />
              London, W1W 5PF<br />
              United Kingdom
            </p>
            <p>
              For privacy-related enquiries, please contact us at: support@me-fie.com
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>We may collect information including:</p>
            <ul>
              <li>Names and email addresses</li>
              <li>Phone numbers and business details</li>
              <li>Social media handles and images</li>
              <li>Event details and payment information</li>
              <li>IP addresses, browser data, and cookies</li>
              <li>Reviews, ratings, and messages</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li>To manage accounts and publish listings</li>
              <li>To process subscriptions and payments</li>
              <li>To verify vendors and improve the platform</li>
              <li>To communicate updates and send marketing communications where permitted</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Legal Basis for Processing</h2>
            <p>
              Where UK GDPR applies, we process data based on the following legal bases:
            </p>
            <ul>
              <li>Consent</li>
              <li>Contractual necessity</li>
              <li>Legitimate interests</li>
              <li>Legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>5. Sharing Your Information</h2>
            <p>
              We do not sell personal data. We may share data with:
            </p>
            <ul>
              <li>Payment processors and hosting providers</li>
              <li>Analytics tools and email platforms</li>
              <li>Legal authorities where required</li>
            </ul>
          </section>

          <section>
            <h2>6. Public Listings</h2>
            <p>
              Listing information such as business names, contact details, event information, images, reviews, and ratings may be publicly displayed on the platform.
            </p>
          </section>

          <section>
            <h2>7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to improve user experience, functionality, and analytics.
            </p>
          </section>

          <section>
            <h2>8. Data Retention</h2>
            <p>
              We retain data only as long as necessary for service delivery, legal obligations, dispute resolution, and enforcement of our terms.
            </p>
          </section>

          <section>
            <h2>9. Your Rights</h2>
            <p>You may have rights regarding your personal data, including the right to:</p>
            <ul>
              <li>Access, correct, or delete your data</li>
              <li>Object to processing or withdraw consent</li>
              <li>Request portability of your personal data</li>
            </ul>
          </section>

          <section>
            <h2>10. Data Security</h2>
            <p>
              We use reasonable technical and organisational measures to protect personal data from unauthorised access or disclosure.
            </p>
          </section>

          <section>
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Updates will be posted on this page.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              For any questions about this Privacy Policy or your personal data, please contact:<br />
              <strong>support@me-fie.com</strong>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}