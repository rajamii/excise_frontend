import { District } from "./district.model";
import { Subdivision } from "./subdivision.model";
import { Role } from "./role.model";
export class Account {
  id?: number;
  username?: string;
  firstName!: string;
  middleName?: string;
  lastName!: string;
  email!: string;
  phoneNumber!: string;
  district?: District;
  subdivision?: Subdivision;
  address!: string;
  role?: Role;
  createdBy?: string;
  isActive?: boolean;
  password?: string;
  confirmPassword?: string;
}
