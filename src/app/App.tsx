import { AlamcenWorkspace } from "../features/alamcen/AlamcenWorkspace";
import { AppUpdateNotice } from "../shared/components/AppUpdateNotice";

export function App() {
  return (
    <>
      <AppUpdateNotice />
      <AlamcenWorkspace />
    </>
  );
}
