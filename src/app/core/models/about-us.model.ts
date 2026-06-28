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
}

export class AboutUs {
  id?: number;
  title!: string;
  content!: string;
  is_active?: boolean;
  isActive?: boolean;
}

