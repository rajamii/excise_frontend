export class Account {
  firstName!: string;
  middleName?: string;
  lastName!: string;
  username!: string;
  phoneNumber!: string;
  email!: string;
  password!: string;
  confirm_password?: string;
  role!: string;
  district!: string;  
  subDivision!: string;
  address?: string;
  createdBy?: string;
  is_active!: boolean;
}