import { Analytics } from '@vercel/analytics/react';
import { CodeforcesUpsolveTracker } from "./features/components";
import "./shared/global.css";

export function App() {
  return (
    <>
      <CodeforcesUpsolveTracker />
      <Analytics />
    </>
  );
}

export default App;