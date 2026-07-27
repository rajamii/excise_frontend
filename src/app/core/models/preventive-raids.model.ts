export interface PreventiveRaidImage {
  id: number;
  image: string;
}

export interface PreventiveRaid {
  id: number;
  title: string;
  subject: string;
  date: string;
  images: PreventiveRaidImage[];
  created_at?: string;
  updated_at?: string;
}
