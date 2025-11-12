import SnakeGame from './components/SnakeGame';
import MultiplayerTest from './components/MultiplayerTest';

export default function Home() {
  // Use split-screen test mode in development only
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return <MultiplayerTest />;
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <SnakeGame />
    </div>
  );
}
