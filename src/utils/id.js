export function generateId(prefix = '') {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function generateNodeId() {
  return generateId('node');
}

export function generateProfileId() {
  return generateId('profile');
}

export function generateSubscriptionId() {
  return generateId('sub');
}
