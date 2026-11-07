import { router } from 'expo-router';
import { Button, Notice, Screen } from '../components/ui';
export default function NotFound() {
  return <Screen title="Let’s get you home." back><Notice>This page isn’t available in the preview.</Notice><Button style={{ marginTop: 20 }} title="Go home" onPress={() => router.replace('/')} /></Screen>;
}
