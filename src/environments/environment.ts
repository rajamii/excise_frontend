export const environment = {
    production: true,
    //apiBaseUrl: 'https://sems.sikkim.gov.in',

    apiBaseUrl: '',

    //  apiBaseUrl: 'http://127.0.0.1:8000',

    // apiBaseUrl: 'http://10.182.2.181:8000',

    payment: {
        billdeskSdkUrl: 'https://uat1.billdesk.com/u2/web/v1_2/sdk',
        billdeskGatewayUrl: 'https://uat1.billdesk.com/pgidsk/PGIMerchantPayment',
        // BillDesk must POST its payment response to a backend endpoint,
        // Django route: /transactional/payment-gateway/billdesk/response/
        callbackUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
        // callbackUrl: 'http://127.0.0.1:8000/transactional/payment-gateway/billdesk/response/',

        cancelUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
        // cancelUrl: 'http://127.0.0.1:8000/transactional/payment-gateway/billdesk/response/',



    },
};
