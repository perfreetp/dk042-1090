import { PropsWithChildren } from 'react';
import { InspectionProvider } from '@/store/InspectionContext';
import './app.scss';

function App({ children }: PropsWithChildren<any>) {
  return (
    <InspectionProvider>
      {children}
    </InspectionProvider>
  );
}

export default App;
