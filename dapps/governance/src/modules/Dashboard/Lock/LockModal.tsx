import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAccount, Unit } from '@cfxjs/use-wallet-react/conflux/Fluent';
import Button from 'common/components/Button';
import Input from 'common/components/Input';
import { PopupClass } from 'common/components/Popup';
import BalanceText from 'common/modules/BalanceText';
import InputMAXSuffix from 'common/components/Input/suffixes/MAX';
import InputCFXPrefixSuffix from 'common/components/Input/suffixes/CFXPrefix';
import { AuthCoreSpace } from 'common/modules/AuthConnectButton';
import Slider, { convertPeriodValueToGapBlockNumber, convertCurrentGapBlockNumberToPeriodValue } from './Slider';
import { useLockedBalance, useAvailableStakedBalance, useGapBlockNumber, BLOCK_SPEED, calVotingRightsPerCfx } from 'governance/src/store';
import { calRemainTime } from 'common/utils/time';
import Close from 'common/assets/icons//close.svg';
import Warning from 'common/assets/icons/warning3.svg';
import handleLock from './handleLock';

const LockModal = new PopupClass();
LockModal.setListStyle({
    top: '206px',
});
LockModal.setItemWrapperClassName('toast-item-wrapper');
LockModal.setAnimatedSize(false);

type Type = 'lock' | 'add' | 'extend';

const title = {
    lock: 'Lock',
    add: 'Add locking amount',
    extend: 'Extend locking period',
};

let hasInit: boolean = false;
const LockModalContent: React.FC<{ type: Type }> = memo(({ type }) => {
    const [inDoubleConfirm, setInDoubleConfirm] = useState(false);
    const { register, handleSubmit: withForm, setValue, watch } = useForm();
    const account = useAccount();
    const lockedBalance = useLockedBalance();
    const availableStakedBalance = useAvailableStakedBalance();
    const isAvailableBalanceGreaterThan0 = availableStakedBalance && Unit.greaterThan(availableStakedBalance, Unit.fromStandardUnit(0));

    const currentGapBlockNumber = useGapBlockNumber();
    const chooseGapBlockNumber = convertPeriodValueToGapBlockNumber(watch('period', convertCurrentGapBlockNumberToPeriodValue(currentGapBlockNumber)) as '0' | '1' | '2');
    const estimateGapBlockNumber = type === 'add' ? currentGapBlockNumber : chooseGapBlockNumber;
    const timeToUnlock = useMemo(
        () =>
            estimateGapBlockNumber
                ? calRemainTime(estimateGapBlockNumber.div(BLOCK_SPEED).mul(Unit.fromMinUnit(1000)).toDecimalMinUnit())
                : undefined,
        [estimateGapBlockNumber]
    );

    const estimateVotingRightsPerCfx = useMemo(
        () => (estimateGapBlockNumber ? calVotingRightsPerCfx(estimateGapBlockNumber) : undefined),
        [estimateGapBlockNumber]
    );

    const estimateBalance = type === 'extend' ? lockedBalance : Unit.fromStandardUnit(watch('amount') || 0).add(lockedBalance ?? Unit.fromMinUnit(0));
    const estimateVotingRights = useMemo(
        () =>
            estimateVotingRightsPerCfx !== undefined && estimateBalance !== undefined ? Unit.fromMinUnit(estimateVotingRightsPerCfx).mul(estimateBalance) : undefined,
        [estimateVotingRightsPerCfx, estimateBalance]
    );

    useEffect(() => {
        if (hasInit) {
            hideLockModal();
        }
    }, [account]);
    useEffect(() => {
        hasInit = true;
        return () => {
            hasInit = false;
        }
    }, []);

    const onSubmit = useCallback(withForm(async (data) => {
        if (!inDoubleConfirm) {
            return setInDoubleConfirm(true);
        }
        
        const { amount, period } = data;
        handleLock({
            increasedLockBalance: !!amount ? Unit.fromStandardUnit(amount, 18) : undefined,
            gapBlockNumber: convertPeriodValueToGapBlockNumber(period)
        })
            .then((needClearAmount) => {
                if (needClearAmount) {
                    setValue('amount', '');
                }
            });
    }), [inDoubleConfirm]);

    return (
        <div className="relative w-[444px] p-[24px] bg-white rounded-[4px]">
            <img
                className="absolute right-[12px] top-[13px] w-[16px] h-[16px] cursor-pointer hover:scale-110 transition-transform select-none z-20"
                onClick={hideLockModal}
                src={Close}
                alt="close icon"
            />
            <p className="mb-[8px] text-[24px] leading-[32px] font-medium text-[#1B1B1C] text-center">{title[type]}</p>
            <p className="mb-[24px] text-[14px] leading-[18px] text-[#898D9A] text-center">
                {type === 'lock' ? 'Available' : 'Locked'}:
                <BalanceText
                    className="ml-[4px] text-[#3D3F4C]"
                    id={`Modal Lock ${type === 'lock' ? 'Available' : 'Locked'} Balance`}
                    balance={type === 'lock' ? availableStakedBalance : lockedBalance}
                    symbol="CFX"
                    placement="bottom"
                    decimals={18}
                />
            </p>

            <form onSubmit={onSubmit}>
                {type !== 'extend' && (
                    <div className="mb-[24px]">
                        <p className="mb-[12px] text-[16px] leading-[22px] text-[#3D3F4C] font-medium">Amount to lock</p>
                        <Input
                            id="governance-lock-input"
                            {...register('amount', {
                                required: true,
                                min: Unit.fromMinUnit(1).toDecimalStandardUnit(),
                                max: availableStakedBalance?.toDecimalStandardUnit(),
                            })}
                            placeholder="Amount you want to lock"
                            type="number"
                            step={1e-18}
                            min={Unit.fromMinUnit(1).toDecimalStandardUnit()}
                            max={availableStakedBalance?.toDecimalStandardUnit()}
                            bindAccout={account}
                            disabled={!isAvailableBalanceGreaterThan0}
                            suffix={[<InputMAXSuffix id="governance-lock-max" />, <InputCFXPrefixSuffix />]}
                        />
                        {type === 'add' && (
                            <p className="mt-[8px] text-[14px] leading-[18px] text-[#898D9A]">
                                Available:
                                <BalanceText
                                    className="ml-[4px] text-[#3D3F4C]"
                                    id="Modal Lock Available Balance 2"
                                    balance={availableStakedBalance}
                                    symbol="CFX"
                                    decimals={18}
                                />
                            </p>
                        )}
                    </div>
                )}

                {type !== 'add' && (
                    <div className="mb-[16px]">
                        <p className="mb-[4px] text-[16px] leading-[22px] text-[#3D3F4C] font-medium">Locking Period</p>
                        <p className="mb-[12px] text-[14px] leading-[18px] text-[#898D9A]">
                            Voting rights is given when CFX are locked for at least a quarter.
                        </p>
                        <Slider
                            id="governance-lock-period"
                            currentGapBlockNumber={currentGapBlockNumber}
                            {...register('period', {
                                required: true,
                            })}
                        />
                    </div>
                )}

                <div className="flex flex-row justify-between items-center">
                    <div>
                        <p className="text-[14px] leading-[18px] text-[#808BE7] font-medium">
                            <BalanceText id="estimate voting rights" balance={estimateVotingRights} symbol="" decimals={18} />
                        </p>
                        <p className="mt-[4px] text-[12px] leading-[16px] text-[#898D9A]">Final voting rights</p>
                    </div>

                    <div className="text-right">
                        <p className="text-[14px] leading-[18px] text-[#3D3F4C] font-medium">
                            About <span id="timeToUnlock" className="text-[#808BE7]">{timeToUnlock ?? '--'}</span> to unlock
                        </p>
                        <p className="mt-[4px] text-[12px] leading-[16px] text-[#898D9A]" id="estimate voting rightsPerCfx">{estimateVotingRightsPerCfx} voting rights/CFX</p>
                    </div>
                </div>

                <AuthCoreSpace
                    id="governance-lock-auth"
                    className="mt-[24px]"
                    size="large"
                    fullWidth
                    type="button"
                    authContent={() => (
                        <Button id="governance-lock" className="mt-[24px]" size="large" fullWidth>
                            Lock
                        </Button>
                    )}
                />

                {inDoubleConfirm && <DoubleConfirm estimateVotingRights={estimateVotingRights} onSubmit={onSubmit} onCancel={() => setInDoubleConfirm(false)} />}
            </form>
        </div>
    );
});


const DoubleConfirm: React.FC<{ estimateVotingRights?: Unit; onSubmit: () => void; onCancel: () => void; }> = ({ estimateVotingRights, onCancel, onSubmit }) => {
    return (
        <div className='absolute flex flex-col justify-between w-full h-full p-[24px] top-0 left-0 bg-white z-10'>
            <div>
                <img src={Warning} alt="Notice" className='mx-auto w-[48px] h-[48px]' />
                <p className='mt-[12px] mb-[24px] text-[24px] leading-[32px] text-[#1B1B1C] font-medium text-center'>Notice</p>
                <p className='text-[14px] leading-[18px] text-[#3D3F4C]'>When the token is locked for voting, you cannot withdraw the token or shorten the lock time.</p>
                <p className='mt-[4px] text-[14px] leading-[18px] text-[#3D3F4C]'>Please vote as soon as possible after the lock to avoid the decline of voting rights.</p>
            </div>

            <div>
                <p className="mt-[24px] text-[14px] leading-[18px] text-[#808BE7] font-medium text-right">
                    <BalanceText id="estimate voting rights" balance={estimateVotingRights} symbol="" decimals={18} />
                </p>
                <p className="mt-[4px] text-[12px] leading-[16px] text-[#898D9A] text-right">Final voting rights</p>

                <div className='mt-[24px] flex justify-end items-center gap-[16px]'>
                    <Button fullWidth size="large" variant='outlined' type="button" onClick={onCancel}>Cancel</Button>
                    <Button fullWidth size="large" type="submit" onClick={onSubmit}>Confirm</Button>
                </div>
            </div>
        </div>
    )
}

export const showLockModal = (type: Type) =>
    LockModal.show({
        Content: <LockModalContent type={type} />,
        duration: 0,
        showMask: true,
        animationType: 'door',
        pressEscToClose: true,
        key: 'LockModal',
    });

export const hideLockModal = () => LockModal.hideAll();
