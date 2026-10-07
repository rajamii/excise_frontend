export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000',

  payment: {
    
    billdeskSdkUrl: 'https://pay.billdesk.com/web/v1_2/sdk',
    billdeskGatewayUrl: 'https://pay.billdesk.com/web/v1_2/sdk',

    callbackUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
    cancelUrl: 'https://sems.sikkim.gov.in/transactional/payment-gateway/billdesk/response/',
  
  },
};
