export interface Asset {
  active: boolean;
  _id: string;
  name: string;
  symbolUnified: string;
  index?: number;
  banned?: boolean;
}
