import { BottomNav } from './components/BottomNav';
import { StorageBanner } from './components/StorageBanner';
import { useRoute, type Route } from './lib/router';
import { GearEditScreen } from './screens/GearEditScreen';
import { GearListScreen } from './screens/GearListScreen';
import { DataScreen, NotFoundScreen, RecipesScreen, SongsScreen } from './screens/Screens';

function CurrentScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'songs':
      return <SongsScreen />;
    case 'gear':
      return <GearListScreen />;
    case 'gearNew':
      return <GearEditScreen />;
    case 'gearEdit':
      return <GearEditScreen id={route.id} />;
    case 'recipes':
      return <RecipesScreen />;
    case 'data':
      return <DataScreen />;
    case 'notFound':
      return <NotFoundScreen path={route.path} />;
  }
}

export default function App() {
  const route = useRoute();
  return (
    <div className="app">
      <StorageBanner />
      <CurrentScreen route={route} />
      <BottomNav current={route.name} />
    </div>
  );
}
