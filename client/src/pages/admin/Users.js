import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import moment from "moment";
import Layout from "../../components/Layout";
import AdminMenu from "../../components/AdminMenu";
import { useAuth } from "../../context/auth";

const Users = () => {
  const [auth] = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth?.token) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/v1/auth/users");
        if (data?.success) {
          setUsers(data.users);
        } else {
          toast.error(data?.message || "Failed to fetch users");
        }
      } catch (error) {
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [auth?.token]);

  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3 dashboard">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>All Users</h1>
            {loading ? (
              <p className="text-muted">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-muted">No users found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Address</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user._id}>
                        <th scope="row">{index + 1}</th>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone}</td>
                        <td>{user.address}</td>
                        <td>{user.role === 1 ? "Admin" : "User"}</td>
                        <td>{moment(user.createdAt).format("LLL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;
