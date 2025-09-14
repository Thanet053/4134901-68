export interface VehicleDetail {
  vehicle_type_id: number;
  vehicle_type_name: string;
  direction_type_id: number;
  direction_type_name: string;
  count: number;
}

export interface CameraData {
  gate_id: number;
  camera_id: number;
  start: string;
  stop: string;
  details: VehicleDetail[];
}

export interface VehicleCountResponse {
  data: CameraData[];
}