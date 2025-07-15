import { LicenseCategory } from "./license-category.model";

export class LicenseSubcategory {
    id?: number;
    description!: string;
    category!: number | LicenseCategory | undefined;
}