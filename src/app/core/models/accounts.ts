export class Account {
  firstName!: string;
  middleName?: string;
  lastName!: string;
  username!: string;
  phoneNumber!: string;
  email!: string;
  password!: string;
  confirmPassword?: string;
  role!: string;
  district!: string;  
  subdivision!: string;
  address?: string;
  createdBy?: string;
  isActive!: boolean;
}