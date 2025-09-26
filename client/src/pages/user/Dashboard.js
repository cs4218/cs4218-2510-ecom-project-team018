import React from "react";
import Layout from "../../components/Layout";
import UserMenu from "../../components/UserMenu";
import { useAuth } from "../../context/auth";
const Dashboard = () => {
  const [auth] = useAuth();
  const user = auth?.user;

  return (
    <Layout title={"Dashboard - Ecommerce App"}>
      <div className="container-flui m-3 p-3 dashboard">
        <div className="row">
          <div className="col-md-3">
            <UserMenu />
          </div>
          <div className="col-md-9">
            <div className="card w-75 p-3">
              {user ? (
                <>
                  <h3>user: {user?.name || "Name Not Found"}</h3>
                  <h3>email: {user?.email || "Email Not Found"}</h3>
                  <h3>address: {user?.address || "Address Not Found"}</h3>
                </>
              ) : (
                <h3>User Data Not Found</h3>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
