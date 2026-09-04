import { Link, useNavigate } from "react-router-dom";


const Dashboard = () => {

  const navigate = useNavigate();
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

      
    <div
      onClick={() => navigate("/offers")}
      className="group cursor-pointer rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5E8EB] text-2xl transition group-hover:scale-110">
        🤝
      </div>

      <h3 className="mt-4 text-lg font-black text-[#21191B]">
        My Trade Offers
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        View offers you've received and offers you've
        sent to other traders.
      </p>

      <div className="mt-4 font-bold text-[#5B1725]">
        Manage Offers →
      </div>
    </div>



      </div>

    </div>
  );
};

export default Dashboard;