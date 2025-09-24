import React from "react";
import { useSearch } from "../../context/search";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
const SearchInput = () => {
  const [search, setSearch] = useSearch();
  console.log(search);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.get(
        `/api/v1/product/search/${search.keyword}`
      );
      setSearch({ ...search, results: data });
      navigate("/search");
    } catch (error) {
      toast.error("Search API failed")
    }
  };
  return (
    <div>
      <form className="d-flex" role="search" onSubmit={handleSubmit}>
        <input
          className="form-control me-2"
          type="search"
          placeholder="Search"
          aria-label="Search"
          value={search.keyword}
          onChange={(e) => setSearch({ ...search, keyword: e.target.value })}
        />
        <button className="btn btn-outline-success" type="submit">
          Search
        </button>
      </form>
    </div>
  );
};

export default SearchInput;