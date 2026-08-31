import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-7xl">

        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Welcome to Barter Trade.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">

          <Link
            to="/marketplace"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-bold">
              Marketplace
            </h2>

            <p className="mt-2 text-gray-500">
              Browse items available for
              barter.
            </p>
          </Link>

          <Link
            to="/listings/create"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-bold">
              List an Item
            </h2>

            <p className="mt-2 text-gray-500">
              Put something up for barter.
            </p>
          </Link>

          <Link
            to="/my-listings"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-bold">
              My Listings
            </h2>

            <p className="mt-2 text-gray-500">
              Manage your barter items.
            </p>
          </Link>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;