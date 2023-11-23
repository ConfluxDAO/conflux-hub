import { useCallback } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import LocalStorage from 'localstorage-enhance';
import Cache from 'common/utils/LRUCache';
import CFX from 'cross-space/src/assets/CFX.svg';
import { store as metaMaskStore } from '@cfxjs/use-wallet-react/ethereum';

export const nativeToken = {
    core_space_name: "Conflux Network",
    core_space_symbol: "CFX",
    evm_space_name: "Conflux Network",
    evm_space_symbol: "CFX",
    decimals: 18,
    icon: CFX,
    isNative: true
} as Token;


export const FansCoin = {
    core_space_name: "FansCoin",
    core_space_symbol: "FC",
    evm_space_name: "FansCoin",
    evm_space_symbol: "FC",
    decimals: 18,
    icon: "https://scan-icons.oss-cn-hongkong.aliyuncs.com/mainnet/cfx%3Aachc8nxj7r451c223m18w2dwjnmhkd6rxawrvkvsy2.svg",
    isInner: true,
    nativeSpace: 'core',
    native_address: "cfx:achc8nxj7r451c223m18w2dwjnmhkd6rxawrvkvsy2",
    mapped_address: "0xba2289fee4673ef00ee8d8dae260965ab543b68f",
}

export interface Token {
    native_address: string;
    mapped_address: string;
    core_space_name: string;
    core_space_symbol: string;
    evm_space_name: string;
    evm_space_symbol: string;
    decimals: number;
    icon: string;
    nativeSpace?: 'core' | 'eSpace';
    isNative?: true;
    isInner?: true;
}

interface TokenStore {
    currentToken: Token;
    commonTokens: Array<Token>;
}

const CommonTokenCount = 10;
const commonTokensCache = new Cache<Token>(CommonTokenCount - 1, 'cross-space-common-tokens');

export const currentTokenStore = create(subscribeWithSelector(() => ({
    currentToken: (LocalStorage.getItem('currentToken', 'cross-space') as Token) ?? FansCoin as Token,
    commonTokens: [nativeToken, ...commonTokensCache.toArr()],
}) as TokenStore));

const selectors = {
    token: (state: TokenStore) => state.currentToken,
    commonTokens: (state: TokenStore) => state.commonTokens,
};

export const startSubToken = () => {
    const unsub = metaMaskStore.subscribe(state => state.status, (status) => {
        if (status === 'not-installed') {
            currentTokenStore.setState({ currentToken: FansCoin as Token });
            LocalStorage.setItem({ key: 'currentToken', data: FansCoin, namespace: 'cross-space' });
        }
    }, { fireImmediately: true });

    return unsub;
}


export const setCurrentToken = (currentToken: Token) => {
    currentTokenStore.setState({ currentToken });
    LocalStorage.setItem({ key: 'currentToken', data: currentToken, namespace: 'cross-space' });

    if (!currentToken.isNative) {
        commonTokensCache.set(currentToken.native_address, currentToken);
        currentTokenStore.setState({ commonTokens: [FansCoin as Token, nativeToken, ...commonTokensCache.toArr()] });
    }
}

export const useToken = () => {
    const currentToken = currentTokenStore(selectors.token);
    const commonTokens = currentTokenStore(selectors.commonTokens);

    const deleteFromCommonTokens = useCallback((deleteToken: Token) => {
        if (!commonTokensCache.delete(deleteToken.native_address)) return;
        currentTokenStore.setState({ commonTokens: [FansCoin as Token, nativeToken, ...commonTokensCache.toArr()] });
    }, []);

    return { currentToken, setCurrentToken, commonTokens, deleteFromCommonTokens };
}

export const getCurrentToken = () => currentTokenStore.getState().currentToken;