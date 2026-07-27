export class Company {
    //company details
    id!: number;
    brandType!: string;
    license!: string;
    applicationYear!: string;
    companyName!: string;
    pan!: string;
    officeAddress!: string;
    country!: string;
    state!: string;
    factoryAddress!: string;
    pinCode!: number;
    companyMobileNumber!: number;
    companyEmailId?: string;

    //member details
    memberName!: string;
    memberDesignation!: string;
    memberMobileNumber!: number;
    memberEmailId?: string;
    memberAddress!: string;

    //payment details
    paymentId!: string;
    paymentDate!: string;
    paymentAmount!: string;
    paymentRemarks?: string;
}

//documents
export class CompanyDocuments {
    exciseLicense?: File;
    deedOfPartnership?: File;
    memorandumOfAssociation?: File;
    undertaking!: File;
}