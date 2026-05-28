import { Redirect } from 'expo-router';

import { useAuth } from '@/src/providers/auth-provider';

export default function IndexScreen() {
  const { initializing, user } = useAuth();

  if (initializing) {
    return null;
  }

  return <Redirect href={user ? '/home' : '/login'} />;
}
