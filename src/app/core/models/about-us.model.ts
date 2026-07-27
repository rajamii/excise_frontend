export class HeadOfOrganisation {
  id?: number;
  name!: string;
  title!: string;
  image!: string | File;
}

export class ExciseSecretary {
  id?: number;
  name!: string;
  designation!: string;
  email!: string;
  from_date?: string | null;
  to_date?: string | null;
}

export class AboutUs {
  id?: number;
  title!: string;
  content!: string;
  is_active?: boolean;
  isActive?: boolean;
}

