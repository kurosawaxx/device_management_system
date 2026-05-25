export type UserRole = 'system' | 'admin' | 'user';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  chatwork_account_id: string | null;
};

export type DeviceType = 'phone' | 'tablet' | 'other';

export type ReservationStatus = 'reserved' | 'in_use' | 'completed' | 'cancelled';

export type Reservation = {
  id: number;
  device_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: ReservationStatus;
  notes: string | null;
  user?: Pick<User, 'id' | 'name'>;
};

export type Device = {
  id: number;
  name: string;
  model: string;
  type: DeviceType;
  image_path: string | null;
  description: string | null;
  is_active: boolean;
  current_reservation: Reservation | null;
  upcoming_reservation: Reservation | null;
  reservations?: Reservation[];
};
