import SnakeGame from './components/SnakeGame';
import MultiplayerTest from './components/MultiplayerTest';

export default function Home() {
  // Use split-screen test mode in development only
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return <MultiplayerTest />;
  }

  return <SnakeGame />;
}
