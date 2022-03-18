import { useLocation } from 'react-router-dom';
import { dapps } from '../App';

const useCurrentDapp = () => {
    const { pathname } = useLocation();
    const currentDappPath = pathname.split('/')[1] || 'cross-space';
    return dapps.find(dapp => dapp.path === currentDappPath)!;
}

export default useCurrentDapp;