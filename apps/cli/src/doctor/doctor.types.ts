export type DoctorCheckStatus = 'ok' | 'error';

export type DoctorCheck = {
  name: string;
  status: DoctorCheckStatus;
  message: string;
};

export type DoctorResult = {
  ok: boolean;
  checks: DoctorCheck[];
};
