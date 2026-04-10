export const environment = {
    production: true,
    // apiBaseUrl: 'https://sems.sikkim.gov.in',


    //apiBaseUrl: 'http://10.182.154.196:8000',


    apiBaseUrl: 'http://127.0.0.1:8000',
    payment: {
        billdeskGatewayUrl: 'https://uat1.billdesk.com/pgidsk/PGIMerchantPayment',
        callbackUrl: 'http://localhost:4200/payment/callback',
        cancelUrl: 'http://localhost:4200/payment/cancel',
    },
};
