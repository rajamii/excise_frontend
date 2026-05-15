export const environment = {
    production: true,
    //apiBaseUrl: 'https://sems.sikkim.gov.in',


    // apiBaseUrl: 'http://10.182.154.196:8000',


    apiBaseUrl: 'http://127.0.0.1:8000',

    // apiBaseUrl: 'http://10.182.2.181:8000',

    payment: {
        billdeskGatewayUrl: 'https://uat1.billdesk.com/pgidsk/PGIMerchantPayment',
        // BillDesk must POST its payment response to a backend endpoint (not an Angular route),
        // otherwise the callback fails (often seen as an Nginx/404/405 error) and wallets won't be credited.
        // Django route: /transactional/payment-gateway/billdesk/response/
        callbackUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
        cancelUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
    },
};
