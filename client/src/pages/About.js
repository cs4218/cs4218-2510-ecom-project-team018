import React from "react";
import Layout from "./../components/Layout";

const About = () => {
  return (
    <Layout title={"About us - Ecommerce app"}>
      <div className="row contactus ">
        <div className="col-md-6 ">
          <img
            src="/images/about.jpeg"
            alt="contactus"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col-md-4">
          <h3>We are a group of software testers from CS4218.</h3>
          <p className="text-justify mt-2">
            Our goal is to learn new things along the way, be happy, and help each other grow.❤️
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default About;