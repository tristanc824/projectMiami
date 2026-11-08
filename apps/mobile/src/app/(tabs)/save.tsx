import { Redirect } from 'expo-router';

/** Savings goals were removed from the app (Nov 7): the balance itself is the savings. Old links go home. */
export default function SaveRoute() {
  return <Redirect href="/" />;
}
