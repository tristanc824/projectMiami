// iOS presents one native modal at a time. Payment sheets yield to the PIN/biometric gate.
let gateVisible = false;
const listeners = new Set<() => void>();
export const securityGateVisible = () => gateVisible;
export function onSecurityGate(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setSecurityGateVisible(value: boolean) {
  if (gateVisible === value) return;
  gateVisible = value; listeners.forEach(listener => listener());
}
