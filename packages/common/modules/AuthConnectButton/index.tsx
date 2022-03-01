import React, { useCallback, memo } from 'react';
import cx from 'clsx';
import { connect as connectFluent, useStatus as useFluentStatus, useChainId as useFluentChainId, switchChain as switchFluentChain, addChain as addFluentChain } from '@cfxjs/use-wallet';
import { connect as connectMetaMask, useStatus as useMetaMaskStatus, useChainId as useMetaMaskChainId, switchChain as switchMetaMaskChain, addChain as addMetaMaskChain } from '@cfxjs/use-wallet/dist/ethereum';
import { useCurrentNetwork, type Network } from '../../../../dapps/cross-space/src/store/index';
import { showToast } from '../../components/tools/Toast';
import useI18n, { compiled } from '../../hooks/useI18n';
import FluentLogo from '../../assets/Fluent.svg';
import MetaMaskLogo from '../../assets/MetaMask.svg';

const transitions = {
    en: {
        wallet: 'Wallet',
        switchTo: 'Switch {wallet} to {networkName}',
        connect_concise: 'Connect {wallet}',
        connect_specific: 'Connect to {space} via {wallet}',
        connecting: '{wallet} Connecting...',
        not_installed: '{wallet} Not Installed',
    },
    zh: {
        wallet: '钱包',
        switchTo: '切换 {wallet} 至 {networkName}',
        connect_concise: '连接 {wallet}',
        connect_specific: '通过 {wallet} 连接到 {space}',
        connecting: '{wallet} 连接中...',
        not_installed: '{wallet} 未安装',
    },
} as const;

export const connectToWallet = async (wallet: 'Fluent' | 'MetaMask') => {
    const connect = wallet === 'Fluent' ? connectFluent : connectMetaMask;
    try {
        await connect();
        showToast(`Connect to ${wallet} Success!`);
    } catch (err) {
        if ((err as any)?.code === 4001) {
            showToast('You cancel the connection reqeust.');
        }
    }
}

const switchToChain = async (wallet: 'Fluent' | 'MetaMask', network: Network) => {
    const switchChain = wallet === 'Fluent' ? switchFluentChain : switchMetaMaskChain;
    const addChain = wallet === 'Fluent' ? addFluentChain : addMetaMaskChain;
    const targetChainId = '0x' + Number(network.networkId).toString(16);

    try {
        await switchChain(targetChainId);
        showToast(`Switch ${wallet} to ${network.name} Success!`);
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if ((switchError as any)?.code === 4902) {
            try {
                await addChain({
                    chainId: targetChainId,
                    chainName: network.name,
                    nativeCurrency: {
                        name: 'Conflux',
                        symbol: 'CFX',
                        decimals: 18,
                    },
                    rpcUrls: [network.url],
                    blockExplorerUrls: [network.scan],
                });
            } catch (addError) {
                if ((addError as any)?.code === 4001) {
                    showToast('You cancel the add chain reqeust.');
                }
            }
        } else if ((switchError as any)?.code === 4001) {
            showToast('You cancel the switch chain reqeust.');
        }
    }
}  

const AuthConnectButton = memo<{
    wallet: 'Fluent' | 'MetaMask' | 'Both-FluentFirst' | 'Both-MetaMaskFirst';
    authContent: any;
    buttonType: 'contained' | 'outlined';
    buttonSize: 'mini' | 'small' | 'normal';
    connectTextType?: 'concise' | 'specific';
    buttonReverse?: boolean;
    showLogo?: boolean;
    fullWidth?: boolean;
    disabled?: boolean;
    id?: string;
    className?: string;
    onClick?: () => void;
}>(({ wallet, authContent, buttonType, buttonSize, buttonReverse, showLogo, disabled, fullWidth, id, className, connectTextType = 'specific', onClick }) => {
    const i18n = useI18n(transitions);

    const currentCoreNetwork = useCurrentNetwork('core');
    const currentESpaceNetwork = useCurrentNetwork('target_eSpace');
    const fluentChainId = useFluentChainId();
    const metaMaskChainId = useMetaMaskChainId();

    const fluentStatus = useFluentStatus();
    const metaMaskStatus = useMetaMaskStatus();
    let currentWallet: 'Fluent' | 'MetaMask' = !wallet.startsWith('Both') ? wallet as 'Fluent' : null!;
    if (currentWallet === null) {
        if (wallet === 'Both-MetaMaskFirst') {
            if (metaMaskStatus !== 'active' || metaMaskChainId !== currentESpaceNetwork?.networkId) currentWallet = 'MetaMask';
            else currentWallet = 'Fluent';
        } else {
            if (fluentStatus !== 'active' || fluentChainId !== currentCoreNetwork?.networkId) currentWallet = 'Fluent';
            else currentWallet = 'MetaMask';
        }
    }

    const status = currentWallet === 'Fluent' ? fluentStatus : metaMaskStatus;
    const Logo = currentWallet == 'Fluent' ? FluentLogo : MetaMaskLogo;
    const currentNetwork = currentWallet == 'Fluent' ? currentCoreNetwork : currentESpaceNetwork;
    const currentWalletChain = currentWallet == 'Fluent' ? fluentChainId : metaMaskChainId;
    const chainMatched = currentWalletChain === currentNetwork?.networkId;

	const handleClick = useCallback<React.MouseEventHandler>((evt) => {
		if (status !== 'active') {
			evt.preventDefault();
            connectToWallet(currentWallet);
		} else if (!chainMatched) {
            if (!currentNetwork) return;
            switchToChain(currentWallet, currentNetwork);
        } else {
            onClick?.();
        }
	}, [currentWallet, chainMatched, currentNetwork, status, onClick]);
    
    if (status === 'active' && chainMatched && typeof authContent !== 'string') {
        if (typeof authContent === 'function') {
            return authContent();
        }

        return authContent;
    }
    
    return (
        <button
            id={id}
            className={cx(`button-${buttonType} button-${buttonSize}`, buttonReverse && 'button-reverse', fullWidth && 'w-full', status === 'not-installed' && 'button-error', className)}
            onClick={handleClick}
            disabled={typeof disabled !== 'undefined' ? disabled : (status !== 'active' && status !== 'not-active')}
        >
            {showLogo && <img src={Logo} alt={`${currentWallet} logo`} className="mr-[4px] w-[14px] h-[14px]" draggable="false" />}

            {status === 'active' && chainMatched && typeof authContent === 'string' && authContent}
            {status === 'active' && !chainMatched && currentNetwork && `${compiled(i18n.switchTo, { wallet: currentWallet, networkName: currentNetwork.name })}`}
            {status === 'not-active' && connectTextType === 'specific' && `${compiled(i18n.connect_specific, { space: currentWallet === 'Fluent' ? 'Conflux Core' : 'Conflux eSpace', wallet: currentWallet })}`}
            {status === 'not-active' && connectTextType === 'concise' && `${compiled(i18n.connect_concise, { wallet: currentWallet })}`}
            {status === 'in-activating' && `${compiled(i18n.connecting, { wallet: currentWallet })}`}
            {status === 'not-installed' && `${compiled(i18n.not_installed, { wallet: currentWallet })}`}
        </button>
    );
});

export default AuthConnectButton;