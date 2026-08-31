const CategoryCard = ({
  category,
  active,
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(category.id)}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-green-600 bg-green-600 text-white"
          : "border-gray-200 bg-white hover:border-green-400"
      }`}
    >
      <h3 className="font-semibold">
        {category.name}
      </h3>

      <p
        className={`mt-1 text-sm ${
          active
            ? "text-green-100"
            : "text-gray-500"
        }`}
      >
        {category._count?.listings || 0} listings
      </p>
    </button>
  );
};

export default CategoryCard;