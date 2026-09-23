import MpesaPayment from "../components/MpesaPayment";

//on a protected trade payment page:
const ProtectedTradePayment = ({
  trade,
}) => {
  return (
    <MpesaPayment
      amount={trade.protectedFee}
      type="PROTECTED_TRADE"
      tradeId={trade.id}
      description={`Protected trade ${trade.tradeNumber}`}
      onSuccess={(payment) => {
        console.log(
          "Payment completed:",
          payment
        );
      }}
      onFailure={(payment) => {
        console.log(
          "Payment failed:",
          payment
        );
      }}
    />
  );
};


/////////For a verification fee:

{/* <MpesaPayment
    amount={100}
    type="VERIFICATION"
    description="Barter Trace item verification"
    />
*/}



//For a promotion 

{/*
   <MpesaPayment
    amount={200}
    type="PROMOTION"
    description="Barter Trace listing promotion"
  > 
*/}




export default ProtectedTradePayment;




