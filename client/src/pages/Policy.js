import React from "react";
import Layout from "./../components/Layout";

const Policy = () => {
  return (
    <Layout title={"Privacy Policy"}>
      <div className="row contactus">
        <div className="col-md-6">
          <img
            src="/images/contactus.jpeg"
            alt="privacy"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col-md-4">
          <h3>Privacy Policy</h3>
          <p>
            We value your privacy and are committed to protecting your personal
            information. This Privacy Policy explains how we collect, use, and
            safeguard your data when you use our website.
          </p>

          <h5>Information We Collect</h5>
          <p>
            We may collect personal information such as your name, email
            address, shipping address, payment details, and order history when
            you place an order or create an account.
          </p>

          <h5>How We Use Your Information</h5>
          <p>
            Your information is used to process orders, provide customer support
            and improve our website.
          </p>

          <h5>Cookies</h5>
          <p>
            Our website uses cookies to improve user experience, remember your
            preferences, and analyze site traffic. You can disable cookies in
            your browser settings.
          </p>

          <h5>Third-Party Services</h5>
          <p>
            We may use trusted third-party services (such as payment processors
            or delivery providers) to help run our business. These parties have
            access to personal information only as needed to perform their
            functions.
          </p>

          <h5>Data Security</h5>
          <p>We implement reasonable safeguards to protect your data.</p>

          <h5>Your Rights</h5>
          <p>
            You may request access to, correction of, or deletion of your
            personal information by contacting us.
          </p>

          <h5>Changes to This Policy</h5>
          <p>We may update this Privacy Policy from time to time.</p>

          <h5>Contact Us</h5>
          <p>
            If you have any questions about this Privacy Policy or how we handle
            your data, please visit our <a href="/contact">Contact Us</a> page.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Policy;
