import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {confirmTrade,completeTrade,getTradeById,updateTradeStatus} from "../api/tradeApi";
import { useAuth } from "../context/AuthContext";

const TradeDetails = () => {
const { id } = useParams();
const navigate = useNavigate();

const { user } = useAuth();

const [trade, setTrade] = useState(null);
const [loading, setLoading] = useState(true);
const [actionLoading, setActionLoading] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");


const loadTrade = useCallback(async () => {
try {
setLoading(true);
setError("");


  const response = await getTradeById(id);

  setTrade(response.trade);
} catch (err) {
  console.error("Load trade error:", err);

  setError(
    err.response?.data?.message || "Failed to load trade."
  );
} finally {
  setLoading(false);
}


}, [id]);

useEffect(() => {
if (id) {
loadTrade();
}
}, [id, loadTrade]);


const isTraderA = useMemo(() => {
if (!trade || !user) return false;


return trade.traderAId === user.id;


}, [trade, user]);

const isTraderB = useMemo(() => {
if (!trade || !user) return false;


return trade.traderBId === user.id;


}, [trade, user]);

const isParticipant = isTraderA || isTraderB;


const traderATradeItem = useMemo(() => {
if (!trade?.items) return null;


return trade.items.find(
  (item) =>
    item.ownerId === trade.traderAId
);


}, [trade]);

const traderBTradeItem = useMemo(() => {
if (!trade?.items) return null;


return trade.items.find(
  (item) =>
    item.ownerId === trade.traderBId
);


}, [trade]);

const yourTradeItem = useMemo(() => {
if (!trade?.items || !user) return null;


return trade.items.find(
  (item) =>
    item.ownerId === user.id
);


}, [trade, user]);

const theirTradeItem = useMemo(() => {
if (!trade?.items || !user) return null;

return trade.items.find((item) => item.ownerId !== user.id);

}, [trade, user]);

const yourListing = yourTradeItem?.listing || null;
const theirListing = theirTradeItem?.listing || null;
const yourAgreedValue = yourTradeItem?.agreedValue ?? yourListing?.estimatedValue ?? null;
const theirAgreedValue = theirTradeItem?.agreedValue ?? theirListing?.estimatedValue ?? null;

const yourTrader = isTraderA
? trade?.traderA
: trade?.traderB;

const otherTrader = isTraderA
? trade?.traderB
: trade?.traderA;


const confirmations = trade?.confirmations || [];

const hasTraderConfirmedStage = (
traderId,
stage
) => {
return confirmations.some(
(confirmation) =>
confirmation.userId === traderId &&
confirmation.stage === stage
);
};

const hasConfirmedStage = (stage) => {
if (!user) return false;


return hasTraderConfirmedStage(
  user.id,
  stage
);


};


const currentConfirmationStage =
useMemo(() => {
if (!trade) return null;


  switch (trade.status) {
    case "PENDING":
      return "AGREEMENT";

    case "AGREED":
      return "VERIFICATION";

    case "VERIFICATION":
      return "HANDOVER";

    default:
      return null;
  }
}, [trade]);


const traderAConfirmedCurrentStage =
currentConfirmationStage
? hasTraderConfirmedStage(
trade?.traderAId,
currentConfirmationStage
)
: false;

const traderBConfirmedCurrentStage =
currentConfirmationStage
? hasTraderConfirmedStage(
trade?.traderBId,
currentConfirmationStage
)
: false;

const hasConfirmedCurrentStage =
currentConfirmationStage
? hasConfirmedStage(
currentConfirmationStage
)
: false;

const bothConfirmedCurrentStage =
traderAConfirmedCurrentStage &&
traderBConfirmedCurrentStage;



const confirmationStageTitle =
useMemo(() => {
switch (currentConfirmationStage) {
case "AGREEMENT":
return "Trade Agreement";


    case "VERIFICATION":
      return "Trade Verification";

    case "HANDOVER":
      return "Handover Confirmation";

    default:
      return "";
  }
}, [currentConfirmationStage]);


const confirmationStageDescription =
useMemo(() => {
switch (currentConfirmationStage) {
case "AGREEMENT":
return "Both traders must agree to the proposed barter before the trade can proceed.";


    case "VERIFICATION":
      return "Both traders must confirm the verification stage before preparing for handover.";

    case "HANDOVER":
      return "Both traders must confirm that they are ready for the physical exchange.";

    default:
      return "";
  }
}, [currentConfirmationStage]);


const confirmationButtonLabel =
useMemo(() => {
switch (currentConfirmationStage) {
case "AGREEMENT":
return "Confirm Trade Agreement";


    case "VERIFICATION":
      return "Confirm Verification";

    case "HANDOVER":
      return "Confirm Handover Readiness";

    default:
      return "Confirm";
  }
}, [currentConfirmationStage]);


const handleConfirmTrade = async () => {
if (!trade) return;


try {
  setActionLoading(true);
  setError("");
  setSuccess("");

  const response = await confirmTrade(
    trade.id
  );

  setTrade(response.trade);

  setSuccess(
    response.message ||
      "Your confirmation has been recorded."
  );

  

  const refreshed = await getTradeById(trade.id);

  setTrade(refreshed.trade);
} catch (err) {
  console.error( "Confirm trade error:",
    err
  );

  setError(
    err.response?.data?.message || "Failed to confirm the trade."
  );
} finally {
  setActionLoading(false);
}


};


const handleStatusUpdate = async (
newStatus
) => {
if (!trade) return;


try {
  setActionLoading(true);
  setError("");
  setSuccess("");

  const response =
    await updateTradeStatus(
      trade.id,
      newStatus
    );

  setTrade(response.trade);

  setSuccess(
    response.message ||
      `Trade moved to ${newStatus}.`
  );

  const refreshed =
    await getTradeById(trade.id);

  setTrade(refreshed.trade);
} catch (err) {
  console.error(
    "Update trade status error:",
    err
  );

  setError(
    err.response?.data?.message ||
      "Failed to update trade status."
  );
} finally {
  setActionLoading(false);
}


};


const handleCompleteTrade = async () => {
if (!trade) return;


const confirmed = window.confirm(
  "Are you sure you want to mark this trade as completed? This action confirms that the exchange has taken place."
);

if (!confirmed) return;

try {
  setActionLoading(true);
  setError("");
  setSuccess("");

  const response =
    await completeTrade(trade.id);

  setTrade(response.trade);

  setSuccess(
    response.message ||
      "Trade completed successfully."
  );

  const refreshed =
    await getTradeById(trade.id);

  setTrade(refreshed.trade);
} catch (err) {
  console.error("Complete trade error:",
    err
  );

  setError( err.response?.data?.message || "Failed to complete trade." );
} finally {
  setActionLoading(false);
}


};


const getStatusClasses = (status) => {
switch (status) {
case "PENDING":
return "bg-yellow-100 text-yellow-800";


  case "AGREED":
    return "bg-blue-100 text-blue-800";

  case "VERIFICATION":
    return "bg-purple-100 text-purple-800";

  case "READY_FOR_HANDOVER":
    return "bg-indigo-100 text-indigo-800";

  case "IN_PROGRESS":
    return "bg-orange-100 text-orange-800";

  case "COMPLETED":
    return "bg-green-100 text-green-800";

  case "CANCELLED":
    return "bg-gray-100 text-gray-700";

  case "DISPUTED":
    return "bg-red-100 text-red-800";

  default:
    return "bg-gray-100 text-gray-700";
}


};



const formatCurrency = (value) => {
if (
value === null ||
value === undefined ||
Number.isNaN(Number(value))
) {
return "Not specified";
}


return new Intl.NumberFormat(
  "en-KE",
  {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }
).format(Number(value));


};



const formatDate = (date) => {
if (!date) return "—";


return new Date(date).toLocaleString(
  "en-KE",
  {
    dateStyle: "medium",
    timeStyle: "short",
  }
);


};



if (loading) {
return ( <div className="flex min-h-[60vh] items-center justify-center bg-[#F8F5F3]"> <div className="text-center"> <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#DCAEB7] border-t-[#5B1725]" />


      <p className="font-semibold text-[#3D0F18]">
        Loading trade...
      </p>
    </div>
  </div>
);


}


if (!trade) {
return ( <div className="min-h-[60vh] bg-[#F8F5F3] px-4 py-12"> <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow"> <h1 className="text-2xl font-bold text-[#3D0F18]">
Trade Not Found </h1>


      <p className="mt-3 text-gray-600">
        {error ||
          "The trade you are looking for could not be found."}
      </p>

      <Link
        to="/trades"
        className="mt-6 inline-block rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
      >
        Back to Trades
      </Link>
    </div>
  </div>
);


}



if (!isParticipant) {
return ( <div className="min-h-[60vh] bg-[#F8F5F3] px-4 py-12"> <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow"> <h1 className="text-2xl font-bold text-[#3D0F18]">
Access Denied </h1>


      <p className="mt-3 text-gray-600">
        You are not a participant in this trade.
      </p>

      <Link
        to="/trades"
        className="mt-6 inline-block rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
      >
        Back to Trades
      </Link>
    </div>
  </div>
);


}



return ( <div className="min-h-screen bg-[#F8F5F3] px-4 py-8"> <div className="mx-auto max-w-6xl">
{/* Back Button */}


    <button
      type="button"
      onClick={() => navigate("/trades")}
      className="mb-6 inline-flex items-center gap-2 font-semibold text-[#5B1725] transition hover:text-[#3D0F18]"
    >
      ← Back to Trades
    </button>

    {/* Header */}

    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Trade Number
          </p>

          <h1 className="mt-1 text-2xl font-black text-[#3D0F18]">
            {trade.tradeNumber}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Created {formatDate(trade.createdAt)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
            trade.status
          )}`}
        >
          {trade.status.replaceAll(
            "_",
            " "
          )}
        </span>
      </div>
    </div>

    {/* Error */}

    {error && (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        {error}
      </div>
    )}

    {/* Success */}

    {success && (
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
        {success}
      </div>
    )}

    {/* Confirmation Section */}

    {currentConfirmationStage && (
      <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-[#5B1725] p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#DCAEB7]">
                Confirmation Required
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {confirmationStageTitle}
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-[#F5E8EB]">
                {confirmationStageDescription}
              </p>
            </div>

            <div className="hidden rounded-full bg-white/10 px-4 py-2 text-sm font-bold sm:block">
              {currentConfirmationStage}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Trader A */}

            <div className="rounded-2xl border border-gray-200 bg-[#FBF5F6] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {trade.traderA?.avatar ? (
                    <img
                      src={trade.traderA.avatar}
                      alt={
                        trade.traderA.name ||
                        "Trader A"
                      }
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCAEB7] font-bold text-[#3D0F18]">
                      {(
                        trade.traderA?.name ||
                        "A"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Trader A
                    </p>

                    <p className="font-bold text-[#3D0F18]">
                      {trade.traderA?.name ||
                        "Trader A"}
                    </p>
                  </div>
                </div>

                {traderAConfirmedCurrentStage ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    ✓ Confirmed
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                    Waiting
                  </span>
                )}
              </div>
            </div>

            {/* Trader B */}

            <div className="rounded-2xl border border-gray-200 bg-[#FBF5F6] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {trade.traderB?.avatar ? (
                    <img
                      src={trade.traderB.avatar}
                      alt={
                        trade.traderB.name ||
                        "Trader B"
                      }
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCAEB7] font-bold text-[#3D0F18]">
                      {(
                        trade.traderB?.name ||
                        "B"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Trader B
                    </p>

                    <p className="font-bold text-[#3D0F18]">
                      {trade.traderB?.name ||
                        "Trader B"}
                    </p>
                  </div>
                </div>

                {traderBConfirmedCurrentStage ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    ✓ Confirmed
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Current User Action */}

          <div className="mt-6">
            {hasConfirmedCurrentStage ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
                <div className="text-3xl">
                  ✓
                </div>

                <h3 className="mt-2 font-bold text-green-800">
                  You have confirmed this stage
                </h3>

                {bothConfirmedCurrentStage ? (
                  <p className="mt-1 text-sm text-green-700">
                    Both traders have confirmed.
                    The trade is moving forward.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-green-700">
                    Waiting for{" "}
                    {otherTrader?.name ||
                      "the other trader"}{" "}
                    to confirm.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmTrade}
                disabled={actionLoading}
                className="w-full rounded-xl bg-[#5B1725] px-6 py-4 font-bold text-white shadow-md transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Processing..."
                  : confirmationButtonLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Trade Participants */}

    <div className="mb-6 grid gap-6 md:grid-cols-2">
      {/* You */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          You
        </p>

        <div className="mt-3 flex items-center gap-4">
          {yourTrader?.avatar ? (
            <img
              src={yourTrader?.avatar}
              alt={yourTrader?.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCAEB7] text-lg font-bold text-[#3D0F18]">
              {(
                yourTrader?.name ||
                "Y"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="font-bold text-[#3D0F18]">
              {yourTrader?.name ||
                "Your account"}
            </h2>

            <p className="text-sm text-gray-500">
              Barter Score:{" "}
              {yourTrader?.barterScore ??
                0}
            </p>
          </div>
        </div>
      </div>

      {/* Other Trader */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Trade Partner
        </p>

        <div className="mt-3 flex items-center gap-4">
          {otherTrader?.avatar ? (
            <img
              src={otherTrader.avatar}
              alt={otherTrader.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCAEB7] text-lg font-bold text-[#3D0F18]">
              {(
                otherTrader?.name ||
                "T"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="font-bold text-[#3D0F18]">
              {otherTrader?.name ||
                "Trade partner"}
            </h2>

            <p className="text-sm text-gray-500">
              Barter Score:{" "}
              {otherTrader?.barterScore ??
                0}
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Items */}

    <div className="mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#3D0F18]">
          Items Being Exchanged
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Review the items and agreed values
          before proceeding.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Your Item */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-[#5B1725] px-5 py-3 text-sm font-bold text-white">
            Your Item
          </div>

          {yourListing ? (
            <>
              <div className="grid grid-cols-2 gap-2 bg-[#F5E8EB] p-3">
                {yourListing.images?.length >
                0 ? (
                  yourListing.images
                    .slice(0, 4)
                    .map((image) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt={
                          yourListing.title
                        }
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    ))
                ) : (
                  <div className="col-span-2 flex h-40 items-center justify-center rounded-xl bg-[#E7DDDF] text-sm font-semibold text-gray-500">
                    No image available
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-[#3D0F18]">
                  {yourListing.title}
                </h3>

                {yourListing.category?.name && (
                  <p className="mt-1 text-sm font-semibold text-[#8A2638]">
                    {yourListing.category.name}
                  </p>
                )}

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {yourListing.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#FBF5F6] p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Condition
                    </p>

                    <p className="mt-1 font-bold text-[#3D0F18]">
                      {yourListing.condition?.replaceAll(
                        "_",
                        " "
                      ) || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FBF5F6] p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Agreed Value
                    </p>

                    <p className="mt-1 font-bold text-[#3D0F18]">
                      {formatCurrency(
                        yourAgreedValue
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Your listing information is
              unavailable.
            </div>
          )}
        </div>

        {/* Their Item */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-[#5B1725] px-5 py-3 text-sm font-bold text-white">
            Trade Partner's Item
          </div>

          {theirListing ? (
            <>
              <div className="grid grid-cols-2 gap-2 bg-[#F5E8EB] p-3">
                {theirListing.images?.length >
                0 ? (
                  theirListing.images
                    .slice(0, 4)
                    .map((image) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt={
                          theirListing.title
                        }
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    ))
                ) : (
                  <div className="col-span-2 flex h-40 items-center justify-center rounded-xl bg-[#E7DDDF] text-sm font-semibold text-gray-500">
                    No image available
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-[#3D0F18]">
                  {theirListing.title}
                </h3>

                {theirListing.category?.name && (
                  <p className="mt-1 text-sm font-semibold text-[#8A2638]">
                    {theirListing.category.name}
                  </p>
                )}

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {theirListing.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#FBF5F6] p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Condition
                    </p>

                    <p className="mt-1 font-bold text-[#3D0F18]">
                      {theirListing.condition?.replaceAll(
                        "_",
                        " "
                      ) || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FBF5F6] p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Agreed Value
                    </p>

                    <p className="mt-1 font-bold text-[#3D0F18]">
                      {formatCurrency(
                        theirAgreedValue
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Trade partner's listing
              information is unavailable.
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Trade Value Summary */}

    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-[#3D0F18]">
        Trade Summary
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-sm text-gray-500">
            Your Item
          </p>

          <p className="mt-1 text-lg font-black text-[#3D0F18]">
            {formatCurrency(
              yourAgreedValue
            )}
          </p>
        </div>

        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-sm text-gray-500">
            Partner's Item
          </p>

          <p className="mt-1 text-lg font-black text-[#3D0F18]">
            {formatCurrency(
              theirAgreedValue
            )}
          </p>
        </div>

        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-sm text-gray-500">
            Handover Location
          </p>

          <p className="mt-1 font-bold text-[#3D0F18]">
            {trade.handoverLocation ||
              "To be agreed"}
          </p>
        </div>
      </div>
    </div>

    {/* Trade Progress */}

    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-[#3D0F18]">
        Trade Progress
      </h2>

      <div className="mt-6 space-y-5">
        {[
          {
            status: "PENDING",
            label: "Trade Agreement",
          },
          {
            status: "AGREED",
            label: "Agreement Confirmed",
          },
          {
            status: "VERIFICATION",
            label: "Verification",
          },
          {
            status: "READY_FOR_HANDOVER",
            label: "Ready for Handover",
          },
          {
            status: "IN_PROGRESS",
            label: "Trade In Progress",
          },
          {
            status: "COMPLETED",
            label: "Completed",
          },
        ].map((step, index) => {
          const statusOrder = [
            "PENDING",
            "AGREED",
            "VERIFICATION",
            "READY_FOR_HANDOVER",
            "IN_PROGRESS",
            "COMPLETED",
          ];

          const currentIndex =
            statusOrder.indexOf(
              trade.status
            );

          const stepIndex =
            statusOrder.indexOf(
              step.status
            );

          const completed =
            currentIndex >= stepIndex;

          return (
            <div
              key={step.status}
              className="flex items-start gap-4"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  completed
                    ? "bg-[#5B1725] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {completed
                  ? "✓"
                  : index + 1}
              </div>

              <div className="flex-1">
                <p
                  className={`font-bold ${
                    completed
                      ? "text-[#3D0F18]"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>

                {step.status ===
                  currentConfirmationStage && (
                  <p className="mt-1 text-sm text-[#8A2638]">
                    Waiting for both traders
                    to confirm this stage.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Action Section */}

    <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-[#3D0F18]">
        Trade Actions
      </h2>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {/* READY_FOR_HANDOVER → IN_PROGRESS */}

        {trade.status ===
          "READY_FOR_HANDOVER" && (
          <button
            type="button"
            onClick={() =>
              handleStatusUpdate(
                "IN_PROGRESS"
              )
            }
            disabled={actionLoading}
            className="rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading
              ? "Processing..."
              : "Start Trade Exchange"}
          </button>
        )}

        {/* IN_PROGRESS → COMPLETED */}

        {trade.status ===
          "IN_PROGRESS" && (
          <button
            type="button"
            onClick={handleCompleteTrade}
            disabled={actionLoading}
            className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading
              ? "Completing..."
              : "Complete Trade"}
          </button>
        )}

        {/* Cancel */}

        {(trade.status === "PENDING" ||
          trade.status === "AGREED" ||
          trade.status ===
            "VERIFICATION" ||
          trade.status ===
            "READY_FOR_HANDOVER") && (
          <button
            type="button"
            onClick={() =>
              handleStatusUpdate(
                "CANCELLED"
              )
            }
            disabled={actionLoading}
            className="rounded-xl border border-red-200 bg-red-50 px-6 py-3 font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel Trade
          </button>
        )}

        {/* Dispute */}

        {(trade.status ===
          "VERIFICATION" ||
          trade.status ===
            "READY_FOR_HANDOVER" ||
          trade.status ===
            "IN_PROGRESS") && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/trades/${trade.id}/dispute`
              )
            }
            className="rounded-xl border border-orange-200 bg-orange-50 px-6 py-3 font-bold text-orange-700 transition hover:bg-orange-100"
          >
            Report a Problem
          </button>
        )}
      </div>
    </div>

    {/* Completion Information */}

    {trade.status === "COMPLETED" && (
      <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-5xl">
          🎉
        </div>

        <h2 className="mt-3 text-2xl font-black text-green-800">
          Trade Completed!
        </h2>

        <p className="mt-2 text-green-700">
          This barter trade was successfully
          completed.
        </p>

        {trade.completedAt && (
          <p className="mt-2 text-sm text-green-600">
            Completed on{" "}
            {formatDate(
              trade.completedAt
            )}
          </p>
        )}

        <div className="mt-5">
          <Link
            to="/trades"
            className="inline-block rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
          >
            Back to My Trades
          </Link>
        </div>
      </div>
    )}
  </div>
</div>


);
};

export default TradeDetails;
