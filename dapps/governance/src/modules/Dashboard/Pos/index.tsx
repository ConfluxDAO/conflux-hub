import React from 'react';

import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { usePosLockArrOrigin } from 'governance/src/store/lockDays&blockNumber';
import Table from '../../../components/Table';
import CFX from 'common/assets/tokens/CFX.svg';

import BalanceText from 'common/modules/BalanceText';
import { showLockModal } from '../Pos/LockModal';

const StakePos: React.FC = () => {

    const posLockArrOrigin = usePosLockArrOrigin();
    
    const isShowPosLock =  posLockArrOrigin && posLockArrOrigin.length > 0;

    return (
        isShowPosLock ?
            <div className='mt-[16px] rounded-[8px] p-[24px] bg-white shadow-md'>
                <div className='w-full text-[16px] text-[#3D3F4C]'>
                    Staked in PoS Validators
                </div>
                <div className='mt-[16px]'>
                    <Table
                        headers={['', 'Amount Staked', 'Amount Locked', 'Locked Periods', 'Voting Power']}
                        rows={posLockArrOrigin.map((item, index) => [
                            <div className='flex'>
                                <img className='w-[24px] h-[24px] rounded-[50px]' src={item.icon || CFX} alt="" />
                                <span className='ml-[8px]'>{item.name}</span>
                            </div>,
                            <BalanceText id="Pos Stake Balance" balance={item.stakeAmount} symbol="CFX" decimals={18} />,
                            <div>
                                <BalanceText id="Pos Lock Balance" balance={item.lockAmount} symbol="CFX" decimals={18} />
                                {
                                    item.lockAmount && !item.lockAmount.equals(Unit.fromMinUnit(0)) ?
                                        <div className='text-[#808BE7] cursor-pointer' onClick={() => showLockModal('more', index)}>Lock</div>
                                        :
                                        <div className='text-[#808BE7] cursor-pointer' onClick={() => showLockModal('lock', index)}>Create Lock</div>
                                }


                            </div>,
                            <div>
                                <div>{item.unlockBlockDay?.toString()} Days</div>
                                <div className='text-[#808BE7] cursor-pointer' onClick={() => showLockModal('extend', index)}>Extend</div>
                            </div>,
                            <BalanceText id="Pos Voting Power" balance={item.votePower} symbol="" />
                        ])}
                    />
                </div>

            </div>
            : <></>
    );
};

export default StakePos;
