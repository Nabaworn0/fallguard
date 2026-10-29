// Emergency info shown to a bystander after a fall and added to the Telegram alert.
// Sample (made-up) person for the demo; both phone numbers are real demo phones.
export const PROFILE = {
  name: "Mr. Prasert Jaidee",
  age: 78,
  phone: "093-046-5921", // this phone, so family can call back

  bloodType: "O+",
  conditions: "Type 2 diabetes, high blood pressure",
  allergies: "Penicillin",
  medications: "Metformin 500 mg, Amlodipine 5 mg",
  contactName: "Somchai Jaidee",
  contactRelation: "Son",
  contactPhone: "080-049-5895",
};

export const AMBULANCE_NUMBER = "1669"; // Thailand emergency medical services

/**
 * Thai number in +66 form (089-765-4321 -> +66897654321).
 * Telegram turns numbers like this into tap-to-call links; it has no tel: link in HTML mode.
 */
export const intlPhone = (phone: string) => {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits.startsWith("0") ? `+66${digits.slice(1)}` : digits;
};

/** tel: link with only digits and + kept */
export const telLink = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;
