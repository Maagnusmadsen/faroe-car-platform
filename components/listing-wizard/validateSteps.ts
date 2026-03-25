import type { ListingWizardData, StepErrors } from "./types";

const MIN_PHOTOS = 3;

export function validateStep1(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  if (!data.title?.trim()) errors.title = "Required";
  if (!data.type || (data.type !== "car_rental" && data.type !== "ride_share")) {
    errors.type = "Required";
  }
  if (!data.brand?.trim()) errors.brand = "Required";
  if (!data.model?.trim()) errors.model = "Required";
  const y = data.year ? parseInt(String(data.year), 10) : NaN;
  if (!Number.isFinite(y) || y < 1990 || y > new Date().getFullYear() + 1) {
    errors.year = "Enter a valid year";
  }
  if (!data.description?.trim()) errors.description = "Required";
  return errors;
}

export function validateStep2(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  if (!data.transmission) errors.transmission = "Required";
  if (!data.fuelType) errors.fuelType = "Required";
  if (data.seats === "" || data.seats === null || data.seats === undefined) {
    errors.seats = "Required";
  }
  if (!data.vehicleType) errors.vehicleType = "Required";
  return errors;
}

export function validateStep3(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  if (!data.town?.trim()) errors.town = "Required";
  if (!data.pickupLocation?.trim()) errors.pickupLocation = "Required";
  return errors;
}

export function validateStep4(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  if (!data.imageUrls?.length || data.imageUrls.length < MIN_PHOTOS) {
    errors.imageUrls = `At least ${MIN_PHOTOS} photos required`;
  }
  return errors;
}

export function validateStep5(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  const price = data.pricePerDay ? parseFloat(String(data.pricePerDay)) : NaN;
  if (!Number.isFinite(price) || price <= 0) {
    errors.pricePerDay = "Daily price must be greater than 0";
  }
  return errors;
}

export function validateStep6(_data: ListingWizardData): StepErrors {
  return {};
}

export function validateStep7(data: ListingWizardData): StepErrors {
  const errors: StepErrors = {};
  if (!data.confirmInsurance) errors.confirmInsurance = "Required";
  if (!data.confirmAllowed) errors.confirmAllowed = "Required";
  if (!data.confirmCorrect) errors.confirmCorrect = "Required";
  return errors;
}

const validators = [
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  validateStep6,
  validateStep7,
];

export function validateStep(step: number, data: ListingWizardData): StepErrors {
  return validators[step] ? validators[step](data) : {};
}

export function isStepValid(step: number, data: ListingWizardData): boolean {
  const err = validateStep(step, data);
  return Object.keys(err).length === 0;
}
