export interface ListFilters {
  page: number;
  limit: number;
  status?: string;
  offerStatus?: string;
  urgency?: string;
  category?: string;
  type?: string;
  severity?: string;
  verification?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}
