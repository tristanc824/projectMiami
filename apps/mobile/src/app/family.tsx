import { Redirect } from 'expo-router';

/** Family goals were removed from the app (Nov 7). Old links go home. */
export default function FamilyRoute() {
  return <Redirect href="/" />;
}
