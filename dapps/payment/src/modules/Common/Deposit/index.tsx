import { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, InputNumber, Select, Row, Col, Button } from 'antd';
import { deposit, getAllowance, approve } from 'payment/src/utils/request';
import { useAccount } from '@cfxjs/use-wallet-react/ethereum';
import { AuthESpace } from 'common/modules/AuthConnectButton';
import { showToast } from 'common/components/showPopup/Toast';
import { startTrack, useTokenList } from 'payment/src/store';
import { ethers } from 'ethers';
import { ButtonType } from 'antd/es/button';
import { useBoundProviderStore } from 'payment/src/store';
import shallow from 'zustand/shallow';
import { useParams, useLocation } from 'react-router-dom';

const { Option } = Select;

interface Props extends React.HTMLAttributes<HTMLDivElement> {
    appAddr: string;
    disabled?: boolean;
    type?: ButtonType;
}

export default ({ appAddr, disabled, type: buttonType, className }: Props) => {
    useEffect(startTrack, []);

    const { fetchAPPs, fetchBillingResource, fetchPaidAPPs } = useBoundProviderStore(
        (state) => ({
            fetchPaidAPPs: state.consumerPaidAPPs.fetch,
            fetchAPPs: state.consumerAPPs.fetch,
            fetchBillingResource: state.billing.fetch,
        }),
        shallow
    );

    const TIPs = useMemo(
        () => [
            '1. APP coins will be used as recharge points that are deducted when using resources.',
            '2. The resource provider will notify the platform of the number of resources you use, and the platform will calculate the resource usage fee and deduct the APP currency balance. The calculation method is: usage times * resource billing weight.',
            '3. You can use the allowed cryptocurrencies to exchange for APP coins, the platform will obtain the Dex quotation to calculate the estimated payment amount, or go to https://app.swappi.io/#/swap to learn more.',
        ],
        []
    );
    const { type: appType } = useParams();
    const { pathname } = useLocation();
    const account = useAccount();
    const TOKENs = useTokenList();
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [errMsg, setErrMsg] = useState<string>('');
    const [toValue, setToValue] = useState<string>('10');
    const [fromValue, setFromValue] = useState<string>(TOKENs[0].eSpace_address);
    const [type, setType] = useState(0); // ok button type, 0 - confirm, 1 - approve

    const token = TOKENs.filter((t) => t.eSpace_address === fromValue)[0];
    const tokenBalance = token.balance?.toDecimalStandardUnit();

    useEffect(() => {
        if (tokenBalance && toValue) {
            if (ethers.utils.parseUnits(toValue, 18).gt(ethers.utils.parseUnits(tokenBalance, 18))) {
                setErrMsg('Insufficient Balance');
            } else {
                setErrMsg('');
            }
        }
    }, [tokenBalance, toValue]);

    const checkAllowance = useCallback(
        async function main() {
            const allowance = await getAllowance({
                tokenAddr: token.eSpace_address,
                appAddr: appAddr,
            });

            if (allowance.lt(ethers.utils.parseUnits(toValue || '0'))) {
                setType(1);
            } else {
                setType(0);
            }
        },
        [account, token.eSpace_address, appAddr, toValue]
    );

    // check selected token allowance
    useEffect(() => {
        isModalVisible && checkAllowance();
    }, [isModalVisible]);

    const handleShowModal = useCallback(() => setIsModalVisible(true), []);

    const handleToChange = useCallback((v: string) => setToValue(v), []);

    const handleFromChange = useCallback((v: string) => setFromValue(v), []);

    const handleOk = async () => {
        try {
            setLoading(true);

            // need approve first
            if (type === 1) {
                await approve({ tokenAddr: token.eSpace_address, appAddr });
                await checkAllowance();
                showToast('Approve success', { type: 'success' });
            } else {
                await deposit({
                    appAddr: appAddr,
                    amount: toValue,
                });
                setIsModalVisible(false);
                showToast('Deposit success', { type: 'success' });
                if (pathname.includes('/consumer/paid-apps')) {
                    fetchPaidAPPs(account);
                } else if (pathname.includes('/consumer/apps')) {
                    fetchAPPs();
                } else if (appType) {
                    fetchBillingResource(appAddr);
                }
            }
        } catch (e) {
            console.log(e);
        }
        setLoading(false);
    };

    const handleCancel = useCallback(() => {
        setIsModalVisible(false);
    }, []);

    // control confirm button status
    const isDisabled = toValue === '0' || toValue === null || !!errMsg;
    const okText = type === 0 ? 'Confirm' : 'Approve';

    return (
        <>
            <AuthESpace
                className={`!rounded-sm !h-[32px] mr-2 mt-2 ${className}`}
                id="createAPP_authConnect"
                size="small"
                connectTextType="concise"
                checkChainMatch={true}
                color="primary"
                shape="rect"
                authContent={() => (
                    <Button
                        id="button_deposit"
                        className={`cursor-pointer mr-2 mt-2 ${className}`}
                        onClick={handleShowModal}
                        disabled={disabled}
                        type={buttonType}
                    >
                        Deposit
                    </Button>
                )}
            />
            {isModalVisible && (
                <Modal
                    title="Deposit Plan"
                    visible={isModalVisible}
                    onOk={handleOk}
                    onCancel={handleCancel}
                    okText={okText}
                    cancelText="Cancel"
                    confirmLoading={loading}
                    wrapClassName="createAPP_modal"
                    okButtonProps={{
                        id: 'button_ok',
                        disabled: isDisabled,
                    }}
                    cancelButtonProps={{
                        id: 'button_cancel',
                    }}
                >
                    <Row gutter={24}>
                        <Col span={8}>
                            <div>From</div>
                            <Select id="select_token" defaultValue={fromValue} style={{ width: '100%' }} onChange={handleFromChange} disabled>
                                {TOKENs.map((t) => (
                                    <Option key={t.eSpace_address} value={t.eSpace_address}>
                                        {t.name}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col span={16}>
                            <div>To</div>
                            <InputNumber<string>
                                id="input_APPCoin_value"
                                stringMode
                                value={toValue}
                                addonAfter="APP Coin"
                                onChange={handleToChange}
                                style={{ width: '100%' }}
                                min="0"
                            ></InputNumber>
                        </Col>
                    </Row>

                    <div className="text-white bg-blue-500 p-2 mt-6 rounded-sm">
                        <Row gutter={24}>
                            <Col span={12} className="!flex items-center">
                                <span>Expected amount in</span>
                            </Col>
                            <Col span={12} className="text-end text-lg">
                                <span id="span_expectedAmountIn">{toValue || 0} USDT</span>
                            </Col>
                        </Row>
                    </div>
                    <div className="text-red-500 text-end min-h-[22px]">{errMsg}</div>
                    <Row gutter={24} className="">
                        <Col span={12}>
                            <span>1 APPCoin = 1 USDT</span>
                        </Col>
                        {/* <Col span={12} className="text-end">
                        <span>~ 1USDT ($1)</span>
                    </Col> */}
                    </Row>

                    <ul id="ul_tips" className="mt-4 mb-0 p-4 bg-red-100 text-gray-600 rounded-sm">
                        {TIPs.map((t, i) => (
                            <li
                                key={i}
                                dangerouslySetInnerHTML={{
                                    __html: t,
                                }}
                            ></li>
                        ))}
                    </ul>
                </Modal>
            )}
        </>
    );
};
