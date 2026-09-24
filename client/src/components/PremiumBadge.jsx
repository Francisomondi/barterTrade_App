import {
  Crown,
} from "lucide-react";

const PremiumBadge = ({
  size = "sm",
  compact = false,
  className = "",
}) => {
  const sizes = {
    sm: {
      wrapper:
        "gap-1 px-2 py-1 text-[9px]",
      icon: 11,
    },

    md: {
      wrapper:
        "gap-1.5 px-2.5 py-1.5 text-[10px]",
      icon: 13,
    },

    lg: {
      wrapper:
        "gap-2 px-3 py-1.5 text-xs",
      icon: 15,
    },
  };

  const selected =
    sizes[size] ||
    sizes.sm;

  return (
    <span
      title="BarterTrade Premium"
      className={`
        inline-flex
        shrink-0
        items-center
        rounded-full
        border
        border-amber-300/60
        bg-amber-50
        font-black
        uppercase
        tracking-wider
        text-amber-700
        ${selected.wrapper}
        ${className}
      `}
    >
      <Crown
        size={
          selected.icon
        }
        fill="currentColor"
      />

      {!compact && (
        <span>
          Premium
        </span>
      )}
    </span>
  );
};

export default PremiumBadge;