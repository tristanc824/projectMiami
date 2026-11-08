import { Redirect } from 'expo-router';

/** Savings goals were removed from the app (Nov 7). Old links go home. */
export default function GoalRoute() {
  return <Redirect href="/" />;
}
