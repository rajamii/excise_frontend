export class Account {
  username!: string;
  firstName!: string;
  middleName?: string;
  lastName!: string;
  email!: string;
  phoneNumber!: string;
  district!: string;
  subdivision!: string;
  address!: string;
  role!: string;
  createdBy?: string;
  isActive?: boolean;

  password?: string;
  confirmPassword?: string;
}
