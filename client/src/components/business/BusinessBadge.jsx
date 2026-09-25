import {
  BadgeCheck,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";

const BADGE_SIZES = {
  sm: {
    container:
      "gap-1 px-2 py-1 text-[11px]",
    icon: 12,
  },

  md: {
    container:
      "gap-1.5 px-2.5 py-1.5 text-xs",
    icon: 14,
  },

  lg: {
    container:
      "gap-2 px-3 py-2 text-sm",
    icon: 16,
  },
};

const BusinessBadge = ({
  business,
  size = "sm",
  showVerified = true,
  showBusinessName = false,
  linkToStore = false,
  className = "",
}) => {
  /*
   * ----------------------------------------------------------
   * NOT A BUSINESS
   * ----------------------------------------------------------
   */

  if (!business?.isBusiness) {
    return null;
  }

  const badgeSize =
    BADGE_SIZES[size] ||
    BADGE_SIZES.sm;

  const label =
    showBusinessName &&
    business.businessName
      ? business.businessName
      : "Business";

  /*
   * ----------------------------------------------------------
   * BUSINESS BADGE
   * ----------------------------------------------------------
   */

  const businessBadge = (
    <span
      className={`
        inline-flex
        max-w-full
        items-center
        rounded-full
        border
        border-amber-500/30
        bg-amber-50
        font-bold
        text-amber-800
        shadow-sm
        ${badgeSize.container}
        ${className}
      `}
      title={
        business.businessName
          ? `Business Account: ${business.businessName}`
          : "Business Account"
      }
    >
      <Store
        size={badgeSize.icon}
        className="shrink-0"
      />

      <span className="truncate">
        {label}
      </span>
    </span>
  );

  /*
   * ----------------------------------------------------------
   * VERIFIED BADGE
   * ----------------------------------------------------------
   *
   * Business and Verification are deliberately separate.
   *
   * Step 10 will control how a Business becomes VERIFIED.
   */

  const verifiedBadge =
    showVerified &&
    business.isVerified ? (
      <span
        className={`
          inline-flex
          items-center
          rounded-full
          border
          border-emerald-500/25
          bg-emerald-50
          font-bold
          text-emerald-700
          shadow-sm
          ${badgeSize.container}
        `}
        title="Verified Business"
      >
        <BadgeCheck
          size={badgeSize.icon}
          className="shrink-0"
        />

        <span>
          Verified
        </span>
      </span>
    ) : null;

  /*
   * ----------------------------------------------------------
   * OPTIONAL STOREFRONT LINK
   * ----------------------------------------------------------
   */

  if (
    linkToStore &&
    business.slug
  ) {
    return (
      <span
        className="
          inline-flex
          flex-wrap
          items-center
          gap-1.5
        "
      >
        <Link
          to={`/business/${business.slug}`}
          className="
            inline-flex
            transition
            duration-200
            hover:-translate-y-0.5
            hover:opacity-90
          "
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {businessBadge}
        </Link>

        {verifiedBadge}
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        flex-wrap
        items-center
        gap-1.5
      "
    >
      {businessBadge}

      {verifiedBadge}
    </span>
  );
};

export default BusinessBadge;